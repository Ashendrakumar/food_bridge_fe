import {
  ApplicationConfig,
  ErrorHandler,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter, TitleStrategy, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { GlobalErrorHandler } from '@core/errors/global-error-handler';
import { AppTitleStrategy } from '@core/services/app-title-strategy';
import { apiEnvelopeInterceptor, authTokenInterceptor } from '@core/http/api.interceptor';
import { AuthService } from '@core/services/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      withFetch(),
      withInterceptors([authTokenInterceptor, apiEnvelopeInterceptor]),
    ),
    // On startup, hydrate the session from GET /auth/me so the shell renders
    // real backend data (falls through instantly when not signed in).
    provideAppInitializer(() => inject(AuthService).refreshCurrentUser()),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    { provide: TitleStrategy, useClass: AppTitleStrategy },
  ],
};
