import { ErrorHandler, Injectable, inject, isDevMode } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastService } from '@core/services/toast.service';

/**
 * Application-wide error handler. Surfaces uncaught errors to the user as a
 * toast (top-right) while still logging the full detail to the console for
 * developers. Registered via `{ provide: ErrorHandler }` in app.config.ts.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly toast = inject(ToastService);

  handleError(error: unknown): void {
    // Always log the raw error so stack traces survive in the console.
    console.error('[GlobalErrorHandler]', error);

    const { title, message } = this.describe(error);
    this.toast.error(message, title);
  }

  private describe(error: unknown): { title: string; message: string; } {
    const unwrapped = this.unwrap(error);

    if (unwrapped instanceof HttpErrorResponse) {
      return this.describeHttp(unwrapped);
    }

    if (unwrapped instanceof Error) {
      return {
        title: 'Something went wrong',
        message: isDevMode()
          ? unwrapped.message
          : 'An unexpected error occurred. Please try again.',
      };
    }

    return {
      title: 'Something went wrong',
      message: 'An unexpected error occurred. Please try again.',
    };
  }

  private describeHttp(error: HttpErrorResponse): { title: string; message: string; } {
    if (error.status === 0) {
      return {
        title: 'Connection lost',
        message: 'Check your internet connection and try again.',
      };
    }

    const serverMessage =
      (typeof error.error === 'string' && error.error) ||
      (error.error && typeof error.error === 'object' && (error.error.message as string)) ||
      error.message;

    if (error.status >= 500) {
      return {
        title: 'Server error',
        message: 'Our servers hit a snag. Please try again shortly.',
      };
    }

    if (error.status === 401 || error.status === 403) {
      return {
        title: 'Access denied',
        message: serverMessage || 'You are not allowed to perform this action.',
      };
    }

    if (error.status === 404) {
      return {
        title: 'Not found',
        message: serverMessage || 'The requested resource could not be found.',
      };
    }

    return {
      title: 'Request failed',
      message: serverMessage || 'Please review your input and try again.',
    };
  }

  /** Angular often wraps the real error; dig it out when present. */
  private unwrap(error: unknown): unknown {
    if (error && typeof error === 'object' && 'rejection' in error) {
      return (error as { rejection: unknown; }).rejection;
    }
    return error;
  }
}
