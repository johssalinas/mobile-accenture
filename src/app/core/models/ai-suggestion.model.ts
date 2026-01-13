/**
 * Modelo de datos para sugerencias de IA usando Vercel AI SDK
 */

/**
 * Respuesta de sugerencia de IA para una categoría
 */
export interface AICategorySuggestion {
  /** Icono sugerido (nombre de ionicons) */
  readonly icon: string;
  /** Color principal en formato hexadecimal */
  readonly color: string;
  /** Color de fondo en formato hexadecimal */
  readonly backgroundColor: string;
  /** Explicación opcional de la sugerencia */
  readonly reasoning?: string;
}

/**
 * Configuración simplificada para IA usando Vercel AI SDK
 * Soporta múltiples proveedores con una API unificada
 */
export interface AIConfig {
  /** 
   * Modelo a utilizar. Ejemplos:
   * - 'openai/gpt-4'
   * - 'openai/gpt-4o-mini'
   * - 'anthropic/claude-3-5-sonnet-20241022'
   * - 'google/gemini-pro'
   * - 'google/gemini-1.5-flash'
   */
  readonly model: string;
  
  /** 
   * Configuración específica del proveedor
   * Para OpenAI: { apiKey: string }
   * Para Anthropic: { apiKey: string }
   * Para Google: { apiKey: string }
   */
  readonly apiKey: string;
  
  /** Timeout en milisegundos (opcional, default: 15000) */
  readonly timeout?: number;
  
  /** Habilitar modo mock para testing (ignora la API) */
  readonly useMock?: boolean;
}
