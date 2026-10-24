import { HttpErrorResponse } from '@angular/common/http';

//* Extrae el mensaje que devuelve Nest
export function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    const message = error.error?.message;
    if (Array.isArray(message)) return message.join('. ');
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}
