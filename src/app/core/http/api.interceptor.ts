import { inject } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpInterceptorFn,
  HttpResponse,
} from '@angular/common/http';
import { catchError, map, throwError } from 'rxjs';
import { environment } from '@env/environment';
import { AUTH_TOKEN_KEY } from '../services/auth.service';
import { StorageService } from '../services/storage.service';

/** The `ApiResponse<T>` envelope every backend endpoint returns. */
interface ApiEnvelope<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  errors: string[] | null;
  traceId: string;
}

function isEnvelope(body: unknown): body is ApiEnvelope {
  return (
    typeof body === 'object' &&
    body !== null &&
    'success' in body &&
    'data' in body &&
    'traceId' in body
  );
}

/** Attaches the stored JWT as a Bearer token to same-API requests. */
export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const storage = inject(StorageService);
  const token = storage.getItem<string>(AUTH_TOKEN_KEY);

  if (token && req.url.startsWith(environment.apiUrl)) {
    return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
  }
  return next(req);
};

/**
 * Unwraps the `ApiResponse<T>` envelope so callers receive the inner `data`,
 * and normalises backend error envelopes into an `Error` carrying the server's
 * `message` (falling back to the first field error, then a generic message).
 */
export const apiEnvelopeInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    map((event: HttpEvent<unknown>) => {
      if (event instanceof HttpResponse && isEnvelope(event.body)) {
        return event.clone({ body: event.body.data });
      }
      return event;
    }),
    catchError((err: HttpErrorResponse) => throwError(() => toError(err))),
  );

function toError(err: HttpErrorResponse): Error {
  const body = err.error as Partial<ApiEnvelope> | undefined;
  const message =
    // Prefer the first field-level validation error (most specific), then the
    // envelope message, then a status-based fallback.
    firstFieldError(body?.errors) ??
    body?.message ??
    (err.status === 0
      ? 'Cannot reach the server. Please check your connection.'
      : 'Something went wrong. Please try again.');
  return new Error(message);
}

/** First entry of the `errors` array, with FluentValidation's "Property: " prefix stripped. */
function firstFieldError(errors: string[] | null | undefined): string | undefined {
  const first = errors?.find((e) => !!e && e.trim().length > 0);
  return first ? first.replace(/^[A-Za-z0-9_.]+:\s+/, '').trim() : undefined;
}
