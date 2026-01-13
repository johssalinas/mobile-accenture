import { Injectable, inject, signal, computed } from '@angular/core';
import { 
  Firestore, 
  collection, 
  collectionData, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  Timestamp 
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Task, CreateTaskDto, UpdateTaskDto, TaskStats } from '../models/task.model';

/**
 * Servicio para gestionar tareas usando Firestore
 * Integración con Firebase Firestore para sincronización en tiempo real
 * Estrategia: localStorage primero (respuesta inmediata) + Firebase en segundo plano
 */
@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private firestore = inject(Firestore);
  private tasksCollection = collection(this.firestore, 'tasks');
  private readonly STORAGE_KEY = 'tasks';
  
  /** Signal privado con estado writable */
  private readonly tasksSignal = signal<Task[]>([]);
  
  /** Signal para el estado de carga */
  private readonly loadingSignal = signal<boolean>(true);
  
  /** Signal público de solo lectura */
  public readonly tasks = this.tasksSignal.asReadonly();
  
  /** Signal público para el estado de carga */
  public readonly loading = this.loadingSignal.asReadonly();
  
  /** Computed signal con el conteo de tareas */
  public readonly taskCount = computed(() => this.tasks().length);
  
  /** Computed signal con el conteo de tareas completadas */
  public readonly completedCount = computed(() => 
    this.tasks().filter(task => task.completed).length
  );
  
  /** Computed signal con el conteo de tareas pendientes */
  public readonly pendingCount = computed(() => 
    this.tasks().filter(task => !task.completed).length
  );

  /** Computed signal con las estadísticas de tareas */
  public readonly taskStats = computed<TaskStats>(() => ({
    total: this.taskCount(),
    completed: this.completedCount(),
    pending: this.pendingCount()
  }));

  constructor() {
    this.loadFromLocalStorage();
    this.loadTasks();
  }

  /**
   * Carga las tareas desde localStorage (sincronía inmediata)
   */
  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      
      if (stored) {
        const tasks: Task[] = JSON.parse(stored);
        
        // Convertir las fechas de string a Date
        const parsedTasks = tasks.map(task => ({
          ...task,
          createdAt: new Date(task.createdAt),
          updatedAt: new Date(task.updatedAt)
        }));
        
        this.tasksSignal.set(parsedTasks);
      }
    } catch (error) {
      console.error('Error al cargar tareas desde localStorage:', error);
    }
  }

  /**
   * Guarda las tareas en localStorage
   */
  private saveToLocalStorage(tasks: Task[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
      console.error('Error al guardar tareas en localStorage:', error);
    }
  }

  /**
   * Carga las tareas desde Firestore con sincronización en tiempo real
   * Se ejecuta en segundo plano después de cargar localStorage
   */
  private loadTasks(): void {
    this.getTasks$().subscribe({
      next: (tasks) => {
        // Sincronizar con localStorage
        this.tasksSignal.set(tasks);
        this.saveToLocalStorage(tasks);
        this.loadingSignal.set(false);
      },
      error: (error) => {
        console.error('Error al cargar tareas desde Firestore:', error);
        this.loadingSignal.set(false);
      }
    });
  }

  /**
   * Observable que escucha cambios en tiempo real de las tareas
   */
  getTasks$(): Observable<Task[]> {
    return collectionData(this.tasksCollection, { idField: 'id' }).pipe(
      map((docs: any[]) => {
        return docs.map(doc => ({
          id: doc.id,
          description: doc.description,
          completed: doc.completed,
          categoryId: doc.categoryId,
          createdAt: doc.createdAt?.toDate() || new Date(),
          updatedAt: doc.updatedAt?.toDate() || new Date()
        }));
      })
    );
  }

  /**
   * Obtiene todas las tareas (snapshot actual)
   */
  getTasks(): Task[] {
    return this.tasks();
  }

  /**
   * Crea una nueva tarea en Firestore (optimistic update)
   * 1. Guarda en localStorage inmediatamente
   * 2. Envía a Firestore en segundo plano
   * @param createTaskDto Datos para crear la tarea
   * @returns Promise con la tarea creada
   */
  async createTask(createTaskDto: CreateTaskDto): Promise<Task> {
    // Generar ID temporal para localStorage
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newTask: Task = {
      id: tempId,
      description: createTaskDto.description,
      completed: false,
      categoryId: createTaskDto.categoryId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // 1. Actualizar localStorage inmediatamente (optimistic update)
    const currentTasks = this.tasks();
    const updatedTasks = [...currentTasks, newTask];
    this.tasksSignal.set(updatedTasks);
    this.saveToLocalStorage(updatedTasks);

    // 2. Enviar a Firebase en segundo plano
    try {
      const taskData = {
        description: createTaskDto.description,
        completed: false,
        categoryId: createTaskDto.categoryId || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(this.tasksCollection, taskData);
      
      // Actualizar la tarea con el ID real de Firebase
      const taskWithRealId: Task = {
        ...newTask,
        id: docRef.id
      };

      // Reemplazar la tarea temporal con la real
      const tasksWithRealId = this.tasks().map(task =>
        task.id === tempId ? taskWithRealId : task
      );
      
      this.tasksSignal.set(tasksWithRealId);
      this.saveToLocalStorage(tasksWithRealId);

      return taskWithRealId;
    } catch (error) {
      console.error('Error al crear tarea en Firestore:', error);
      // Mantener la tarea local aunque falle Firebase
      return newTask;
    }
  }

  /**
   * Actualiza una tarea existente en Firestore (optimistic update)
   * 1. Actualiza localStorage inmediatamente
   * 2. Envía a Firestore en segundo plano
   * 3. Si falla, revierte al estado anterior
   * @param id ID de la tarea a actualizar
   * @param updateTaskDto Datos a actualizar
   * @returns Promise con la tarea actualizada o null si no existe
   */
  async updateTask(id: string, updateTaskDto: UpdateTaskDto): Promise<Task | null> {
    const currentTasks = this.tasks();
    const task = currentTasks.find(t => t.id === id);
    
    if (!task) {
      return null;
    }

    // Guardar estado anterior para posible rollback
    const previousTasks = currentTasks;

    // 1. Actualizar localStorage inmediatamente (optimistic update)
    const updatedTask: Task = {
      ...task,
      ...updateTaskDto,
      updatedAt: new Date()
    };

    const updatedTasks = currentTasks.map(t =>
      t.id === id ? updatedTask : t
    );
    
    this.tasksSignal.set(updatedTasks);
    this.saveToLocalStorage(updatedTasks);

    // 2. Enviar a Firebase en segundo plano (solo si no es ID temporal)
    if (!id.startsWith('temp_')) {
      try {
        const taskRef = doc(this.firestore, 'tasks', id);
        
        const updateData: any = {
          ...updateTaskDto,
          updatedAt: serverTimestamp()
        };

        await updateDoc(taskRef, updateData);
      } catch (error) {
        console.error('Error al actualizar tarea en Firestore:', error);
        
        // Rollback: revertir al estado anterior
        this.tasksSignal.set(previousTasks);
        this.saveToLocalStorage(previousTasks);
        
        throw error;
      }
    }

    return updatedTask;
  }

  /**
   * Alterna el estado de completado de una tarea
   * @param id ID de la tarea
   * @returns Promise con la tarea actualizada o null si no existe
   */
  async toggleTask(id: string): Promise<Task | null> {
    const currentTasks = this.tasks();
    const task = currentTasks.find(t => t.id === id);
    
    if (!task) {
      return null;
    }

    return this.updateTask(id, { completed: !task.completed });
  }

  /**
   * Alterna el estado de completado de una tarea (alias de toggleTask)
   * @param id ID de la tarea
   * @returns Promise con la tarea actualizada o null si no existe
   */
  async toggleTaskCompletion(id: string): Promise<Task | null> {
    return this.toggleTask(id);
  }

  /**
   * Elimina una tarea de Firestore (optimistic update)
   * 1. Elimina de localStorage inmediatamente
   * 2. Envía a Firestore en segundo plano
   * 3. Si falla, revierte al estado anterior
   * @param id ID de la tarea a eliminar
   * @returns Promise<void>
   */
  async deleteTask(id: string): Promise<void> {
    const currentTasks = this.tasks();
    const task = currentTasks.find(t => t.id === id);
    
    if (!task) {
      return;
    }

    // Guardar estado anterior para posible rollback
    const previousTasks = currentTasks;

    // 1. Eliminar de localStorage inmediatamente (optimistic update)
    const updatedTasks = currentTasks.filter(t => t.id !== id);
    
    this.tasksSignal.set(updatedTasks);
    this.saveToLocalStorage(updatedTasks);

    // 2. Enviar a Firebase en segundo plano (solo si no es ID temporal)
    if (!id.startsWith('temp_')) {
      try {
        const taskRef = doc(this.firestore, 'tasks', id);
        await deleteDoc(taskRef);
      } catch (error) {
        console.error('Error al eliminar tarea de Firestore:', error);
        
        // Rollback: revertir al estado anterior
        this.tasksSignal.set(previousTasks);
        this.saveToLocalStorage(previousTasks);
        
        throw error;
      }
    }
  }

  /**
   * Filtra tareas por categoría
   * @param categoryId ID de la categoría (null para tareas sin categoría)
   * @returns Array de tareas filtradas
   */
  getTasksByCategory(categoryId: string | null): Task[] {
    return this.tasks().filter(task => task.categoryId === categoryId);
  }

  /**
   * Obtiene tareas completadas
   */
  getCompletedTasks(): Task[] {
    return this.tasks().filter(task => task.completed);
  }

  /**
   * Obtiene tareas pendientes
   */
  getPendingTasks(): Task[] {
    return this.tasks().filter(task => !task.completed);
  }
}
