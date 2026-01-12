import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmark, ellipsisHorizontal } from 'ionicons/icons';
import { Task } from '../../../core/models/task.model';

/**
 * Componente presentacional para mostrar una tarea individual
 * Implementa el patrón Dumb Component usando signals de Angular
 */
@Component({
  selector: 'app-task-item',
  templateUrl: './task-item.component.html',
  styleUrls: ['./task-item.component.scss'],
  standalone: true,
  imports: [CommonModule, IonButton, IonIcon]
})
export class TaskItemComponent {
  /** Signal input para la tarea a mostrar */
  task = input.required<Task>();
  
  /** Signal input para indicar si la tarea está seleccionada */
  selected = input(false);

  /** Output event cuando se hace toggle en el checkbox */
  taskToggle = output<Task>();
  
  /** Output event cuando se abren las opciones */
  optionsClick = output<{ task: Task; event: Event }>();

  constructor() {
    addIcons({
      'checkmark': checkmark,
      'ellipsis-horizontal': ellipsisHorizontal
    });
  }

  /**
   * Maneja el click en el checkbox
   */
  onToggle(): void {
    this.taskToggle.emit(this.task());
  }

  /**
   * Maneja el click en el botón de opciones
   */
  onOptionsClick(event: Event): void {
    this.optionsClick.emit({ task: this.task(), event });
  }
}
