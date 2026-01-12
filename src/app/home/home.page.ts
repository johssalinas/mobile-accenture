import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent, 
  IonButton,
  IonIcon,
  IonActionSheet,
  AlertController,
  ActionSheetButton
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  chevronBackOutline, 
  ellipsisHorizontal,
  checkmark,
  createOutline,
  trashOutline,
  folderOutline
} from 'ionicons/icons';

import { Task } from '../core/models/task.model';
import { TaskService } from '../core/services/task.service';

/**
 * Página principal que muestra la lista de tareas
 * Utiliza Signals para la gestión reactiva del estado
 */
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonHeader, 
    IonToolbar, 
    IonTitle, 
    IonContent,
    IonButton,
    IonIcon,
    IonActionSheet
  ],
})
export class HomePage {
  /** Signal para la tarea seleccionada */
  selectedTask = signal<Task | null>(null);
  
  /** Signal para el estado del action sheet */
  isActionSheetOpen = signal(false);
  
  /** Acceso directo a las tareas del servicio (signal readonly) */
  tasks = this.taskService.tasks;
  
  /** Computed signals del servicio */
  taskCount = this.taskService.taskCount;
  completedCount = this.taskService.completedCount;
  pendingCount = this.taskService.pendingCount;

  /** Botones del action sheet */
  actionSheetButtons: ActionSheetButton[] = [
    {
      text: 'Editar Tarea',
      icon: 'create-outline',
      handler: () => {
        this.editTask();
        return true;
      }
    },
    {
      text: 'Eliminar Tarea',
      icon: 'trash-outline',
      role: 'destructive',
      handler: () => {
        this.deleteTask();
        return true;
      }
    },
    {
      text: 'Cancelar',
      role: 'cancel'
    }
  ];

  constructor(
    private taskService: TaskService,
    private alertController: AlertController
  ) {
    // Registrar iconos
    addIcons({
      'chevron-back-outline': chevronBackOutline,
      'ellipsis-horizontal': ellipsisHorizontal,
      'checkmark': checkmark,
      'create-outline': createOutline,
      'trash-outline': trashOutline,
      'folder-outline': folderOutline
    });
  }

  /**
   * Alterna el estado de completado de una tarea
   */
  toggleTask(task: Task): void {
    this.taskService.toggleTaskCompletion(task.id);
  }

  /**
   * Abre el action sheet para una tarea
   */
  openTaskOptions(task: Task, event: Event): void {
    event.stopPropagation();
    this.selectedTask.set(task);
    this.isActionSheetOpen.set(true);
  }

  /**
   * Cierra el action sheet
   */
  closeActionSheet(): void {
    this.isActionSheetOpen.set(false);
    setTimeout(() => {
      this.selectedTask.set(null);
    }, 300);
  }

  /**
   * Inicia el proceso de agregar una nueva tarea
   */
  async addNewTask(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Nueva Tarea',
      inputs: [
        {
          name: 'description',
          type: 'text',
          placeholder: 'Descripción de la tarea',
          attributes: {
            maxlength: 200
          }
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Agregar',
          handler: (data) => {
            if (data.description && data.description.trim()) {
              this.taskService.createTask({ description: data.description.trim() });
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Inicia el proceso de edición de una tarea
   */
  async editTask(): Promise<void> {
    const currentTask = this.selectedTask();
    if (!currentTask) return;

    this.closeActionSheet();

    const alert = await this.alertController.create({
      header: 'Editar Tarea',
      inputs: [
        {
          name: 'description',
          type: 'text',
          placeholder: 'Descripción de la tarea',
          value: currentTask.description,
          attributes: {
            maxlength: 200
          }
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Guardar',
          handler: (data) => {
            if (data.description && data.description.trim()) {
              this.taskService.updateTask(currentTask.id, { 
                description: data.description.trim() 
              });
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Confirma y elimina una tarea
   */
  async deleteTask(): Promise<void> {
    const currentTask = this.selectedTask();
    if (!currentTask) return;

    this.closeActionSheet();

    const alert = await this.alertController.create({
      header: 'Eliminar Tarea',
      message: '¿Estás seguro de que deseas eliminar esta tarea?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.taskService.deleteTask(currentTask.id);
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Obtiene el estado de guardado
   */
  getSaveStatus(): string {
    return 'Guardado...';
  }

  /**
   * Función de tracking para el @for (mejora el rendimiento)
   */
  trackByTaskId(index: number, task: Task): string {
    return task.id;
  }
}
