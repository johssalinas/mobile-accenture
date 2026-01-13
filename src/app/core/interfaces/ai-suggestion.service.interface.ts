import { AICategorySuggestion } from '../models/ai-suggestion.model';

/**
 * Interfaz abstracta para servicios de sugerencias de IA
 * Permite implementar diferentes proveedores de IA de manera intercambiable
 * mediante inyección de dependencias
 */
export abstract class AISuggestionService {
  /**
   * Sugiere un icono y colores para una categoría basándose en su nombre
   * @param categoryName Nombre de la categoría
   * @returns Promise con la sugerencia generada por IA
   */
  abstract suggestCategoryStyle(categoryName: string): Promise<AICategorySuggestion>;

  /**
   * Verifica si el servicio está correctamente configurado
   * @returns true si está listo para usar
   */
  abstract isConfigured(): boolean;

  /**
   * Obtiene el nombre del proveedor
   * @returns Nombre del proveedor de IA
   */
  abstract getProviderName(): string;
}
