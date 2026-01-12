import { Component, signal, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { 
  IonContent,
  AlertController,
  NavController
} from '@ionic/angular/standalone';

import { Task, TaskHeaderConfig } from '../core/models/task.model';
import { TaskService } from '../core/services/task.service';
import { TaskDialogService } from '../core/services/task-dialog.service';
import { CategoryService } from '../core/services/category.service';

// Componentes granulares
import { TaskHeaderComponent } from '../shared/components/task-header/task-header.component';
import { TaskListComponent } from '../shared/components/task-list/task-list.component';
import { AddTaskButtonComponent } from '../shared/components/add-task-button/add-task-button.component';
import { TaskOptionsComponent } from '../shared/components/task-options/task-options.component';

/**
 * Página principal que actúa como contenedor inteligente (Smart Component)
 * Coordina la interacción entre componentes presentacionales granulares
 * Implementa las mejores prácticas de Angular 20 con función inject y signals
 */
@Component({
  selector: 'app-tareas',
  templateUrl: 'tareas.page.html',
  styleUrls: ['tareas.page.scss'],
  imports: [
    CommonModule,
    IonContent,
    TaskHeaderComponent,
    TaskListComponent,
    AddTaskButtonComponent,
    TaskOptionsComponent
  ],
})
export class TareasPage implements OnInit {
  // Inyección usando la función inject (Angular 20 best practice)
  private readonly taskService = inject(TaskService);
  private readonly taskDialogService = inject(TaskDialogService);
  private readonly categoryService = inject(CategoryService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly navController = inject(NavController);

  /** Signal para la tarea seleccionada */
  protected readonly selectedTask = signal<Task | null>(null);
  
  /** Signal para el estado del action sheet */
  protected readonly isActionSheetOpen = signal(false);
  
  /** Signal para el ID de la categoría actual */
  protected readonly currentCategoryId = signal<string | null>(null);
  
  /** Configuración del header (se actualizará con el nombre de la categoría) */
  protected readonly headerConfig = signal<TaskHeaderConfig>({
    title: 'Tareas',
    showBackButton: true
  });
  
  /** Computed signal para tareas filtradas por categoría */
  protected readonly tasks = computed<Task[]>(() => {
    const categoryId = this.currentCategoryId();
    const allTasks = this.taskService.tasks();
    
    // Si no hay categoría seleccionada, mostrar todas las tareas
    if (!categoryId) {
      return allTasks;
    }
    
    // Filtrar solo las tareas de la categoría actual
    return allTasks.filter(task => task.categoryId === categoryId);
  });
  
  /** Computed signal para estadísticas de tareas filtradas */
  protected readonly taskStats = computed(() => {
    const filteredTasks = this.tasks();
    return {
      total: filteredTasks.length,
      completed: filteredTasks.filter(t => t.completed).length,
      pending: filteredTasks.filter(t => !t.completed).length
    };
  });
  
  /** Signal para el estado de carga */
  protected readonly isLoading = this.taskService.loading;

  ngOnInit(): void {
    // Capturar el categoryId de los queryParams
    this.route.queryParams.subscribe(params => {
      const categoryId = params['categoryId'];
      this.currentCategoryId.set(categoryId || null);
      
      // Actualizar el título del header con el nombre de la categoría
      if (categoryId) {
        const category = this.categoryService.getCategoryById(categoryId);
        if (category) {
          this.headerConfig.set({
            title: category.name,
            showBackButton: true
          });
        }
      }
    });
  }

  /**
   * Maneja el click en el botón de retroceso del header
   */
  protected onHeaderBackClick(): void {
    this.navController.navigateBack('/categories');
  }

  /**
   * Alterna el estado de completado de una tarea
   */
  protected onTaskToggle(task: Task): void {
    this.taskService.toggleTaskCompletion(task.id);
  }

  /**
   * Abre el action sheet para una tarea
   */
  protected onTaskOptions(data: { task: Task; event: Event }): void {
    data.event.stopPropagation();
    this.selectedTask.set(data.task);
    this.isActionSheetOpen.set(true);
  }

  /**
   * Cierra el action sheet
   */
  protected onActionSheetDismiss(): void {
    this.isActionSheetOpen.set(false);
    setTimeout(() => {
      this.selectedTask.set(null);
    }, 300);
  }

  /**
   * Inicia el proceso de agregar una nueva tarea
   * Asigna automáticamente la categoría actual si existe
   */
  protected async onAddNewTask(): Promise<void> {
    const taskData = await this.taskDialogService.showCreateTaskDialog();
    
    if (taskData) {
      // Asignar la categoría actual automáticamente
      const categoryId = this.currentCategoryId();
      this.taskService.createTask({
        ...taskData,
        categoryId: categoryId || undefined
      });
    }
  }

  /**
   * Inicia el proceso de edición de una tarea
   */
  protected async onEditTask(task: Task): Promise<void> {
    this.onActionSheetDismiss();
    
    const updateData = await this.taskDialogService.showEditTaskDialog(task);
    
    if (updateData) {
      this.taskService.updateTask(task.id, updateData);
    }
  }

  /**
   * Confirma y elimina una tarea
   */
  protected async onDeleteTask(task: Task): Promise<void> {
    this.onActionSheetDismiss();
    
    const confirmed = await this.taskDialogService.showDeleteTaskConfirmation(task);
    
    if (confirmed) {
      this.taskService.deleteTask(task.id);
    }
  }

  /**
   * Cambia la categoría de una tarea
   */
  protected async onChangeCategory(task: Task): Promise<void> {
    this.onActionSheetDismiss();
    
    const newCategoryId = await this.taskDialogService.showCategorySelector(task.categoryId);
    
    if (newCategoryId && newCategoryId !== task.categoryId) {
      this.taskService.updateTask(task.id, { categoryId: newCategoryId });
    }
  }
}
