/**
 * Modelo de datos para una categoría de tareas
 */
export interface Category {
  /** Identificador único de la categoría */
  readonly id: string;
  
  /** Nombre de la categoría */
  readonly name: string;
  
  /** Color de la categoría en formato hexadecimal */
  readonly color: string;
  
  /** Color de fondo del ícono */
  readonly backgroundColor: string;
  
  /** Icono Material Symbols para la categoría */
  readonly icon: string;
  
  /** Fecha de creación de la categoría */
  readonly createdAt: Date;
  
  /** Fecha de última actualización */
  readonly updatedAt: Date;
}

/**
 * DTO para crear una nueva categoría
 */
export interface CreateCategoryDto {
  readonly name: string;
  readonly color: string;
  readonly backgroundColor: string;
  readonly icon: string;
}

/**
 * DTO para actualizar una categoría existente
 */
export interface UpdateCategoryDto {
  readonly name?: string;
  readonly color?: string;
  readonly backgroundColor?: string;
  readonly icon?: string;
}

/**
 * Configuración de estado para el header de categorías
 */
export interface CategoryHeaderConfig {
  readonly title: string;
  readonly showBackButton: boolean;
}

/**
 * Configuración para los botones del action sheet de opciones de categoría
 */
export interface CategoryActionConfig {
  readonly text: string;
  readonly icon?: string;
  readonly role?: 'destructive' | 'cancel';
  readonly handler?: () => void;
}

/**
 * Estadísticas de categorías
 */
export interface CategoryStats {
  readonly total: number;
  readonly withTasks: number;
  readonly empty: number;
}

/**
 * Datos de una categoría con contador de tareas
 */
export interface CategoryWithCount extends Category {
  readonly taskCount: number;
}

/**
 * Opciones de iconos predefinidos para categorías (Ionicons v7)
 */
export const CATEGORY_ICONS = [
  'briefcase-outline',
  'home-outline',
  'bulb-outline',
  'person-outline',
  'fitness-outline',
  'airplane-outline',
  'cart-outline',
  'school-outline',
  'heart-outline',
  'star-outline',
  'restaurant-outline',
  'film-outline',
  'musical-note-outline',
  'football-outline',
  'color-palette-outline',
  'code-slash-outline',
  'paw-outline',
  'sunny-outline',
  'medkit-outline',
  'car-outline'
] as const;

/**
 * Combinaciones de colores predefinidas para categorías
 */
export const CATEGORY_COLOR_PRESETS = [
  { color: '#007AFF', backgroundColor: '#E3F2FD' }, // Azul
  { color: '#FF9500', backgroundColor: '#FFF3E0' }, // Naranja
  { color: '#B8860B', backgroundColor: '#FFF9C4' }, // Amarillo oscuro
  { color: '#9C27B0', backgroundColor: '#F3E5F5' }, // Púrpura
  { color: '#10B981', backgroundColor: '#D1FAE5' }, // Esmeralda
  { color: '#DC2626', backgroundColor: '#FEE2E2' }, // Rojo/Rosa
  { color: '#EC4899', backgroundColor: '#FCE7F3' }, // Rosa
  { color: '#14B8A6', backgroundColor: '#CCFBF1' }, // Turquesa
  { color: '#F59E0B', backgroundColor: '#FEF3C7' }, // Ámbar
  { color: '#6366F1', backgroundColor: '#E0E7FF' }  // Índigo
] as const;
