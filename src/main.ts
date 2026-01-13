import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getRemoteConfig, provideRemoteConfig } from '@angular/fire/remote-config';
import { setLogLevel, LogLevel } from '@angular/fire';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';
import { AI_PROXY_CONFIG } from './app/core/services/ai-suggestion.service';

// Silenciar los avisos de zonas de AngularFire en producción/desarrollo
setLogLevel(LogLevel.SILENT);

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideHttpClient(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideFirestore(() => getFirestore()),
    provideRemoteConfig(() => getRemoteConfig()),
    {
      provide: AI_PROXY_CONFIG,
      useValue: {
        proxyUrl: environment.aiProxyUrl || '',
        useMock: !environment.aiProxyUrl
      }
    }
  ],
});
