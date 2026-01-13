import { Injectable, InjectionToken, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AICategorySuggestion, AIConfig } from '../models/ai-suggestion.model';
import { CATEGORY_ICONS, CATEGORY_COLOR_PRESETS } from '../models/category.model';

/**
 * Token de inyección para la configuración del proxy
 */
export const AI_PROXY_CONFIG = new InjectionToken<AIProxyConfig>('AI_PROXY_CONFIG');

/**
 * Configuración del proxy AWS Lambda
 */
export interface AIProxyConfig {
  /** URL del API Gateway de AWS Lambda */
  proxyUrl: string;
  /** Timeout en milisegundos (default: 15000) */
  timeout?: number;
  /** Usar mock en lugar del proxy (útil para desarrollo offline) */
  useMock?: boolean;
}

/**
 * Request al proxy Lambda
 */
interface AIProxyRequest {
  categoryName: string;
  model?: string;
}

/**
 * Response del proxy Lambda
 */
interface AIProxyResponse {
  icon: string;
  color: string;
  confidence?: number;
  provider?: string;
}

/**
 * Servicio de sugerencias de IA usando AWS Lambda como proxy
 * 
 * ARQUITECTURA SEGURA:
 * Frontend → AWS Lambda (proxy) → API de IA (Gemini/OpenAI/Claude)
 * 
 * Las API keys están SOLO en el backend (Lambda), nunca expuestas al cliente.
 * 
 * Instalación Backend (Lambda):
 * 1. cd lambda && npm install
 * 2. npm run package
 * 3. cd ../terraform && terraform apply
 * 
 * Configuración Frontend (app.config.ts):
 * {
 *   provide: AI_PROXY_CONFIG,
 *   useValue: {
 *     proxyUrl: 'https://abc123.execute-api.us-east-1.amazonaws.com/dev/suggest'
 *   }
 * }
 */
@Injectable({
  providedIn: 'root'
})
export class AISuggestionService {
  private http = inject(HttpClient);
  private config = inject(AI_PROXY_CONFIG, { optional: true });

  constructor() {
    if (this.config) {
      console.log('✅ AI Proxy configurado:', this.config.proxyUrl);
      console.log('   - Use Mock:', this.config.useMock);
    } else {
      console.log('⚠️ AI Proxy NO configurado, usando mock local');
    }
  }

  /**
   * Sugiere icono y colores para una categoría usando el proxy Lambda
   */
  async suggestCategoryStyle(categoryName: string): Promise<AICategorySuggestion> {
    // Usar mock si está configurado explícitamente
    if (!this.config || this.config.useMock) {
      console.log('🔧 Usando sugerencia local (mock)');
      return this.getMockSuggestion(categoryName);
    }

    try {
      console.log('🌐 Llamando al backend Lambda:', this.config.proxyUrl);
      const timeout = this.config.timeout || 15000;

      // Llamar al proxy Lambda con timeout
      const result = await Promise.race([
        this.callProxyAPI(categoryName),
        this.createTimeout(timeout)
      ]);

      return this.parseProxyResponse(result, categoryName);

    } catch (error: any) {
      console.error('❌ Error calling AI proxy:', error);
      console.log('⚠️ Fallback a sugerencia local');
      // Fallback a mock
      return this.getMockSuggestion(categoryName);
    }
  }

  /**
   * Llama al proxy Lambda API
   */
  private async callProxyAPI(categoryName: string): Promise<AIProxyResponse> {
    if (!this.config?.proxyUrl) {
      throw new Error('Proxy URL not configured');
    }

    const request: AIProxyRequest = {
      categoryName: categoryName.trim()
    };

    console.log('📡 POST', this.config.proxyUrl, request);

    // HTTP POST al Lambda proxy
    const response = await firstValueFrom(
      this.http.post<AIProxyResponse>(this.config.proxyUrl, request)
    );

    console.log('✅ Respuesta del backend:', response);
    return response;
  }

  /**
   * Parsea la respuesta del proxy Lambda
   */
  private parseProxyResponse(response: AIProxyResponse, categoryName: string): AICategorySuggestion {
    try {
      // El backend puede retornar cualquier ícono de Ionicons
      // No limitamos a CATEGORY_ICONS, confiamos en el backend
      const icon = response.icon || this.getRandomIcon();

      // Validar formato de color hexadecimal
      const colorRegex = /^#[0-9A-Fa-f]{6}$/;
      const color = colorRegex.test(response.color) 
        ? response.color 
        : this.getRandomColor().color;
      
      // Generar backgroundColor más claro
      const backgroundColor = this.lightenColor(color);

      console.log('✨ Sugerencia procesada:', { icon, color, backgroundColor });

      return {
        icon,
        color,
        backgroundColor,
        reasoning: `Sugerido por ${response.provider || 'AI'} con ${Math.round((response.confidence || 0.95) * 100)}% de confianza`
      };

    } catch (error) {
      console.error('❌ Error parsing proxy response:', error);
      return this.getMockSuggestion(categoryName);
    }
  }

  /**
   * Aclara un color para usarlo como background
   */
  private lightenColor(hex: string): string {
    // Convertir hex a RGB
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    // Aclarar 80% (mezclar con blanco)
    const newR = Math.round(r + (255 - r) * 0.8);
    const newG = Math.round(g + (255 - g) * 0.8);
    const newB = Math.round(b + (255 - b) * 0.8);

    // Convertir de vuelta a hex
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  }

  /**
   * Genera sugerencia usando lógica local (fallback)
   */
  private getMockSuggestion(categoryName: string): AICategorySuggestion {
    const normalizedName = categoryName.toLowerCase().trim();
    
    // Mapa de palabras clave a estilos (usando Ionicons con sufijo -outline)
    const keywordMap = new Map<string, { icon: string; colorIndex: number }>([
      // Trabajo y productividad
      ['trabajo', { icon: 'briefcase-outline', colorIndex: 0 }],
      ['oficina', { icon: 'briefcase-outline', colorIndex: 0 }],
      ['proyecto', { icon: 'code-slash-outline', colorIndex: 6 }],
      ['reunión', { icon: 'people-outline', colorIndex: 0 }],
      
      // Personal y hogar
      ['casa', { icon: 'home-outline', colorIndex: 1 }],
      ['hogar', { icon: 'home-outline', colorIndex: 1 }],
      ['personal', { icon: 'person-outline', colorIndex: 8 }],
      ['familia', { icon: 'heart-outline', colorIndex: 7 }],
      
      // Educación
      ['estudio', { icon: 'school-outline', colorIndex: 2 }],
      ['universidad', { icon: 'school-outline', colorIndex: 2 }],
      ['curso', { icon: 'book-outline', colorIndex: 2 }],
      ['aprendizaje', { icon: 'bulb-outline', colorIndex: 3 }],
      
      // Salud y fitness
      ['salud', { icon: 'medkit-outline', colorIndex: 7 }],
      ['ejercicio', { icon: 'fitness-outline', colorIndex: 4 }],
      ['gimnasio', { icon: 'fitness-outline', colorIndex: 4 }],
      ['deporte', { icon: 'football-outline', colorIndex: 4 }],
      
      // Compras y finanzas
      ['compras', { icon: 'cart-outline', colorIndex: 5 }],
      ['mercado', { icon: 'cart-outline', colorIndex: 5 }],
      ['dinero', { icon: 'cash-outline', colorIndex: 5 }],
      
      // Ocio y entretenimiento
      ['viaje', { icon: 'airplane-outline', colorIndex: 9 }],
      ['vacaciones', { icon: 'airplane-outline', colorIndex: 9 }],
      ['película', { icon: 'film-outline', colorIndex: 10 }],
      ['música', { icon: 'musical-note-outline', colorIndex: 11 }],
      ['arte', { icon: 'color-palette-outline', colorIndex: 12 }],
      
      // Mascotas y naturaleza
      ['mascota', { icon: 'paw-outline', colorIndex: 13 }],
      ['perro', { icon: 'paw-outline', colorIndex: 13 }],
      ['gato', { icon: 'paw-outline', colorIndex: 13 }],
      ['jardín', { icon: 'sunny-outline', colorIndex: 14 }],
      
      // Transporte
      ['carro', { icon: 'car-outline', colorIndex: 15 }],
      ['auto', { icon: 'car-outline', colorIndex: 15 }],
      ['transporte', { icon: 'car-outline', colorIndex: 15 }],
      
      // Comida
      ['comida', { icon: 'restaurant-outline', colorIndex: 16 }],
      ['cocina', { icon: 'restaurant-outline', colorIndex: 16 }],
      ['recetas', { icon: 'restaurant-outline', colorIndex: 16 }]
    ]);

    // Buscar coincidencia
    for (const [keyword, suggestion] of keywordMap.entries()) {
      if (normalizedName.includes(keyword)) {
        const preset = CATEGORY_COLOR_PRESETS[suggestion.colorIndex];
        return {
          icon: suggestion.icon,
          color: preset.color,
          backgroundColor: preset.backgroundColor,
          reasoning: `Sugerencia basada en la palabra "${keyword}"`
        };
      }
    }

    // Fallback: usar hash del nombre para consistencia
    const hash = this.hashString(normalizedName);
    const iconIndex = hash % CATEGORY_ICONS.length;
    const colorIndex = hash % CATEGORY_COLOR_PRESETS.length;
    
    const preset = CATEGORY_COLOR_PRESETS[colorIndex];
    
    return {
      icon: CATEGORY_ICONS[iconIndex],
      color: preset.color,
      backgroundColor: preset.backgroundColor,
      reasoning: 'Sugerencia local basada en el nombre'
    };
  }

  private getRandomIcon(): string {
    return CATEGORY_ICONS[Math.floor(Math.random() * CATEGORY_ICONS.length)];
  }

  private getRandomColor() {
    return CATEGORY_COLOR_PRESETS[Math.floor(Math.random() * CATEGORY_COLOR_PRESETS.length)];
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
    });
  }
}
