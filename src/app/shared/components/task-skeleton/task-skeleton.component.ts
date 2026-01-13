import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Componente skeleton para mostrar mientras se cargan las tareas
 * Implementa un placeholder animado que simula el diseño de las tarjetas de tarea
 */
@Component({
  selector: 'app-task-skeleton',
  templateUrl: './task-skeleton.component.html',
  styleUrls: ['./task-skeleton.component.scss'],
  imports: [CommonModule]
})
export class TaskSkeletonComponent {
  /** Número de skeletons a mostrar */
  @Input() count: number = 8;
  
  /** Array para iterar en el template */
  protected get skeletonArray(): number[] {
    return Array(this.count).fill(0).map((_, i) => i);
  }
}
