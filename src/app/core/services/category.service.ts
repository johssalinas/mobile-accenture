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
import { 
  Category, 
  CreateCategoryDto, 
  UpdateCategoryDto, 
  CategoryStats,
  CategoryWithCount 
} from '../models/category.model';

/**
 * Servicio para gestionar categorías usando Firestore
 * Integración con Firebase Firestore para sincronización en tiempo real
 */
@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private firestore = inject(Firestore);
  private categoriesCollection = collection(this.firestore, 'categories');
  private readonly STORAGE_KEY = 'categories';
  
  /** Signal privado con estado writable */
  private readonly categoriesSignal = signal<Category[]>([]);
  
  /** Signal para el estado de carga */
  private readonly loadingSignal = signal<boolean>(true);
  
  /** Signal público de solo lectura */
  public readonly categories = this.categoriesSignal.asReadonly();
  
  /** Signal público para el estado de carga */
  public readonly loading = this.loadingSignal.asReadonly();
  
  /** Computed signal con el conteo de categorías */
  public readonly categoryCount = computed(() => this.categories().length);
  
  /** Computed signal con las estadísticas de categorías */
  public readonly categoryStats = computed<CategoryStats>(() => ({
    total: this.categoryCount(),
    withTasks: 0, // Se calculará cuando se integre con TaskService
    empty: this.categoryCount()
  }));

  constructor() {
    this.loadFromLocalStorage();
    this.loadCategories();
  }

  /**
   * Carga las categorías desde localStorage (sincronía inmediata)
   */
  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      
      if (stored) {
        const categories: Category[] = JSON.parse(stored);
        
        // Convertir las fechas de string a Date
        const parsedCategories = categories.map(category => ({
          ...category,
          createdAt: new Date(category.createdAt),
          updatedAt: new Date(category.updatedAt)
        }));
        
        this.categoriesSignal.set(parsedCategories);
        this.loadingSignal.set(false);
      }
    } catch (error) {
      console.error('Error al cargar categorías desde localStorage:', error);
    }
  }

  /**
   * Guarda las categorías en localStorage
   */
  private saveToLocalStorage(categories: Category[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(categories));
    } catch (error) {
      console.error('Error al guardar categorías en localStorage:', error);
    }
  }

  /**
   * Carga las categorías desde Firestore con sincronización en tiempo real
   * Se ejecuta en segundo plano después de cargar localStorage
   */
  private loadCategories(): void {
    this.getCategories$().subscribe({
      next: (categories) => {
        // Sincronizar con localStorage
        this.saveToLocalStorage(categories);
        this.categoriesSignal.set(categories);
        this.loadingSignal.set(false);
      },
      error: (error) => {
        console.error('Error al cargar categorías desde Firestore:', error);
        // Si falla Firebase, mantenemos lo que hay en localStorage
        this.loadingSignal.set(false);
      }
    });
  }

  /**
   * Observable que escucha cambios en tiempo real de las categorías
   */
  getCategories$(): Observable<Category[]> {
    return collectionData(this.categoriesCollection, { idField: 'id' }).pipe(
      map((docs: any[]) => {
        return docs.map(doc => ({
          id: doc.id,
          name: doc.name,
          color: doc.color,
          backgroundColor: doc.backgroundColor,
          icon: doc.icon,
          createdAt: doc.createdAt?.toDate() || new Date(),
          updatedAt: doc.updatedAt?.toDate() || new Date()
        }));
      })
    );
  }

  /**
   * Obtiene todas las categorías (snapshot actual)
   */
  getCategories(): Category[] {
    return this.categories();
  }

  /**
   * Obtiene una categoría por su ID
   * @param id ID de la categoría
   * @returns La categoría o undefined si no existe
   */
  getCategoryById(id: string): Category | undefined {
    return this.categories().find(c => c.id === id);
  }

  /**
   * Crea una nueva categoría (optimistic update)
   * 1. Guarda en localStorage inmediatamente
   * 2. Envía a Firestore en segundo plano
   * @param createCategoryDto Datos para crear la categoría
   * @returns Promise con la categoría creada
   */
  async createCategory(createCategoryDto: CreateCategoryDto): Promise<Category> {
    // Generar ID temporal para localStorage
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newCategory: Category = {
      id: tempId,
      name: createCategoryDto.name,
      color: createCategoryDto.color,
      backgroundColor: createCategoryDto.backgroundColor,
      icon: createCategoryDto.icon,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // 1. Actualizar localStorage inmediatamente (optimistic update)
    const currentCategories = this.categories();
    const updatedCategories = [...currentCategories, newCategory];
    this.categoriesSignal.set(updatedCategories);
    this.saveToLocalStorage(updatedCategories);

    // 2. Enviar a Firebase en segundo plano
    try {
      const categoryData = {
        name: createCategoryDto.name,
        color: createCategoryDto.color,
        backgroundColor: createCategoryDto.backgroundColor,
        icon: createCategoryDto.icon,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(this.categoriesCollection, categoryData);

      // 3. Reemplazar el ID temporal con el ID real de Firebase
      const categoryWithRealId: Category = {
        ...newCategory,
        id: docRef.id
      };

      const categoriesWithRealId = this.categories().map(cat => 
        cat.id === tempId ? categoryWithRealId : cat
      );
      
      this.categoriesSignal.set(categoriesWithRealId);
      this.saveToLocalStorage(categoriesWithRealId);

      return categoryWithRealId;
    } catch (error) {
      console.error('Error al crear categoría en Firestore:', error);
      // Mantener la categoría local aunque falle Firebase
      return newCategory;
    }
  }

  /**
   * Actualiza una categoría existente (optimistic update)
   * 1. Actualiza localStorage inmediatamente
   * 2. Envía a Firestore en segundo plano
   * 3. Si falla, revierte al estado anterior
   * @param id ID de la categoría a actualizar
   * @param updateCategoryDto Datos a actualizar
   * @returns Promise con la categoría actualizada o null si no existe
   */
  async updateCategory(id: string, updateCategoryDto: UpdateCategoryDto): Promise<Category | null> {
    const category = this.getCategoryById(id);
    
    if (!category) {
      return null;
    }

    // Guardar estado anterior para posible rollback
    const previousCategories = this.categories();

    // 1. Actualizar localStorage inmediatamente (optimistic update)
    const updatedCategory: Category = {
      ...category,
      ...updateCategoryDto,
      updatedAt: new Date()
    };

    const updatedCategories = previousCategories.map(cat =>
      cat.id === id ? updatedCategory : cat
    );
    
    this.categoriesSignal.set(updatedCategories);
    this.saveToLocalStorage(updatedCategories);

    // 2. Enviar a Firebase en segundo plano (solo si no es ID temporal)
    if (!id.startsWith('temp_')) {
      try {
        const categoryRef = doc(this.firestore, 'categories', id);
        
        const updateData: any = {
          ...updateCategoryDto,
          updatedAt: serverTimestamp()
        };

        await updateDoc(categoryRef, updateData);
      } catch (error) {
        console.error('Error al actualizar categoría en Firestore:', error);
        
        // Rollback: Revertir al estado anterior
        this.categoriesSignal.set(previousCategories);
        this.saveToLocalStorage(previousCategories);
        
        throw error;
      }
    }

    return updatedCategory;
  }

  /**
   * Elimina una categoría (optimistic update)
   * 1. Elimina de localStorage inmediatamente
   * 2. Envía a Firestore en segundo plano
   * 3. Si falla, revierte al estado anterior
   * @param id ID de la categoría a eliminar
   * @returns Promise con true si se eliminó correctamente, false si no existe
   */
  async deleteCategory(id: string): Promise<boolean> {
    const category = this.getCategoryById(id);
    
    if (!category) {
      return false;
    }

    // Guardar estado anterior para posible rollback
    const previousCategories = this.categories();

    // 1. Eliminar de localStorage inmediatamente (optimistic update)
    const updatedCategories = previousCategories.filter(cat => cat.id !== id);
    
    this.categoriesSignal.set(updatedCategories);
    this.saveToLocalStorage(updatedCategories);

    // 2. Enviar a Firebase en segundo plano (solo si no es ID temporal)
    if (!id.startsWith('temp_')) {
      try {
        const categoryRef = doc(this.firestore, 'categories', id);
        await deleteDoc(categoryRef);
      } catch (error) {
        console.error('Error al eliminar categoría en Firestore:', error);
        
        // Rollback: Restaurar la categoría eliminada
        this.categoriesSignal.set(previousCategories);
        this.saveToLocalStorage(previousCategories);
        
        throw error;
      }
    }

    return true;
  }

  /**
   * Obtiene categorías con contador de tareas
   * @param taskCounts Mapa de ID de categoría a número de tareas
   * @returns Array de categorías con contador
   */
  getCategoriesWithCount(taskCounts: Map<string, number>): CategoryWithCount[] {
    return this.categories().map(category => ({
      ...category,
      taskCount: taskCounts.get(category.id) || 0
    }));
  }
}
