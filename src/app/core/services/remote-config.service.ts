import { Injectable, inject } from '@angular/core';
import { RemoteConfig, getRemoteConfig, fetchAndActivate, getValue, getBoolean } from '@angular/fire/remote-config';

/**
 * Servicio para gestionar Firebase Remote Config
 * Permite activar/desactivar funcionalidades mediante feature flags
 */
@Injectable({
  providedIn: 'root'
})
export class RemoteConfigService {
  private remoteConfig: RemoteConfig | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    // No inicializar en el constructor para evitar bucles
  }

  /**
   * Inicializa Remote Config con valores por defecto (lazy initialization)
   */
  private async initializeRemoteConfig(): Promise<void> {
    // Evitar múltiples inicializaciones
    if (this.initialized || this.initPromise) {
      return this.initPromise || Promise.resolve();
    }

    this.initPromise = (async () => {
      try {
        this.remoteConfig = getRemoteConfig();
        
        // Configuración de Remote Config
        this.remoteConfig.settings = {
          minimumFetchIntervalMillis: 3600000, // 1 hora en producción
          fetchTimeoutMillis: 60000 // 1 minuto
        };

        // Valores por defecto
        this.remoteConfig.defaultConfig = {
          'ai_suggestions_enabled': true,
          'ai_suggestions_model': 'mock'
        };

        // Fetch y activar valores remotos (solo la primera vez)
        await fetchAndActivate(this.remoteConfig);
        this.initialized = true;
        
        console.log('✅ Remote Config inicializado correctamente');
      } catch (error) {
        console.error('❌ Error inicializando Remote Config:', error);
        this.initialized = false;
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  /**
   * Verifica si las sugerencias de IA están habilitadas
   * @returns true si las sugerencias de IA están habilitadas
   */
  async isAISuggestionsEnabled(): Promise<boolean> {
    await this.initializeRemoteConfig();
    
    if (!this.initialized || !this.remoteConfig) {
      return true;
    }

    try {
      return getBoolean(this.remoteConfig, 'ai_suggestions_enabled');
    } catch (error) {
      console.error('Error obteniendo feature flag ai_suggestions_enabled:', error);
      return true;
    }
  }

  /**
   * Obtiene el modelo de IA configurado
   * @returns Nombre del modelo de IA
   */
  async getAIModel(): Promise<string> {
    await this.initializeRemoteConfig();
    
    if (!this.initialized || !this.remoteConfig) {
      return 'mock';
    }

    try {
      const value = getValue(this.remoteConfig, 'ai_suggestions_model');
      return value.asString();
    } catch (error) {
      console.error('Error obteniendo ai_suggestions_model:', error);
      return 'mock';
    }
  }

  /**
   * Fuerza una actualización de Remote Config
   * Útil para testing o refresh manual
   */
  async forceRefresh(): Promise<void> {
    if (!this.remoteConfig) {
      await this.initializeRemoteConfig();
      return;
    }

    try {
      await fetchAndActivate(this.remoteConfig);
      console.log('✅ Remote Config actualizado manualmente');
    } catch (error) {
      console.error('❌ Error actualizando Remote Config:', error);
    }
  }

  /**
   * Obtiene todos los valores de Remote Config (útil para debugging)
   */
  async getAllValues(): Promise<Record<string, any>> {
    await this.initializeRemoteConfig();
    
    if (!this.initialized || !this.remoteConfig) {
      return {
        'ai_suggestions_enabled': true,
        'ai_suggestions_model': 'mock'
      };
    }

    return {
      'ai_suggestions_enabled': await this.isAISuggestionsEnabled(),
      'ai_suggestions_model': await this.getAIModel()
    };
  }
}
