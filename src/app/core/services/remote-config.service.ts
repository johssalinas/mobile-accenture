import { Injectable, inject, runInInjectionContext, Injector } from '@angular/core';
import { 
  RemoteConfig, 
  fetchAndActivate, 
  getBoolean, 
  getString 
} from '@angular/fire/remote-config';

/**
 * Servicio para gestionar Firebase Remote Config
 * Permite activar/desactivar funcionalidades mediante feature flags
 */
@Injectable({
  providedIn: 'root'
})
export class RemoteConfigService {
  private remoteConfig = inject(RemoteConfig);
  private injector = inject(Injector);

  constructor() {
    // Configurar valores por defecto inmediatamente
    this.remoteConfig.settings = {
      // Para desarrollo: siempre refetch (sin cache local del SDK)
      minimumFetchIntervalMillis: 0,
      fetchTimeoutMillis: 60000 // 1 minuto
    };

    this.remoteConfig.defaultConfig = {
      'ai_suggestions_enabled': true,
      'ai_suggestions_model': 'mock'
    };
  }

  /**
   * Realiza fetch & activate siempre, dentro del contexto de inyección
   */
  private async fetchAndActivateContext(): Promise<void> {
    return runInInjectionContext(this.injector, async () => {
      await fetchAndActivate(this.remoteConfig);
    });
  }

  /**
   * Verifica si las sugerencias de IA están habilitadas
   * @returns true si las sugerencias de IA están habilitadas
   */
  async isAISuggestionsEnabled(): Promise<boolean> {
    await this.fetchAndActivateContext();
    return runInInjectionContext(this.injector, () => {
      try {
        return getBoolean(this.remoteConfig, 'ai_suggestions_enabled');
      } catch (_error) {
        return true;
      }
    });
  }

  /**
   * Obtiene el modelo de IA configurado
   * @returns Nombre del modelo de IA
   */
  async getAIModel(): Promise<string> {
    await this.fetchAndActivateContext();
    return runInInjectionContext(this.injector, () => {
      try {
        return getString(this.remoteConfig, 'ai_suggestions_model');
      } catch (_error) {
        return 'mock';
      }
    });
  }

  /**
   * Fuerza una actualización de Remote Config
   */
  async forceRefresh(): Promise<void> {
    return this.fetchAndActivateContext();
  }

  /**
   * Obtiene todos los valores de Remote Config
   */
  async getAllValues(): Promise<Record<string, any>> {
    await this.fetchAndActivateContext();
    return {
      'ai_suggestions_enabled': await this.isAISuggestionsEnabled(),
      'ai_suggestions_model': await this.getAIModel()
    };
  }
}
