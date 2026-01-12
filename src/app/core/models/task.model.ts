/**
 * Modelo de datos para una tarea
 */
export interface Task {
  /** Identificador único de la tarea */
  id: string;
  
  /** Descripción o título de la tarea */
  description: string;
  
  /** Estado de completado de la tarea */
  completed: boolean;
  
  /** Fecha de creación de la tarea */
  createdAt: Date;
  
  /** Fecha de última actualización */
  updatedAt: Date;
}

/**
 * DTO para crear una nueva tarea
 */
export interface CreateTaskDto {
  description: string;
}

/**
 * DTO para actualizar una tarea existente
 */
export interface UpdateTaskDto {
  description?: string;
  completed?: boolean;
}
