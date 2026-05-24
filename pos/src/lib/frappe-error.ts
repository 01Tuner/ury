import { showToast } from '../components/ui/toast';

const DISPLAYED_FLAG = '_frappeErrorDisplayed';

type FrappeErrorPayload = {
  _server_messages?: string;
  message?: string;
  exception?: string;
  exc?: string;
  exc_type?: string;
};

function hasFrappeErrorFields(payload: FrappeErrorPayload | null | undefined): boolean {
  if (!payload || typeof payload !== 'object') return false;
  return (
    (typeof payload._server_messages === 'string' && payload._server_messages.length > 0) ||
    (typeof payload.exception === 'string' && payload.exception.length > 0) ||
    (typeof payload.exc === 'string' && payload.exc.length > 0) ||
    typeof payload.exc_type === 'string'
  );
}

function getErrorPayload(error: unknown): FrappeErrorPayload | null {
  if (!error || typeof error !== 'object') return null;

  const direct = error as FrappeErrorPayload & {
    response?: { data?: FrappeErrorPayload };
  };

  if (hasFrappeErrorFields(direct)) {
    return direct;
  }

  const fromResponse = direct.response?.data;
  if (fromResponse && hasFrappeErrorFields(fromResponse)) {
    return fromResponse;
  }

  return direct;
}

export function hasFrappeServerMessages(error: unknown): boolean {
  const payload = getErrorPayload(error);
  return typeof payload?._server_messages === 'string' && payload._server_messages.length > 0;
}

function parseServerMessages(raw: string): string[] {
  const texts: string[] = [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return texts;

    for (const entry of parsed) {
      if (typeof entry === 'string') {
        try {
          const inner = JSON.parse(entry) as { message?: string };
          if (inner?.message) {
            texts.push(inner.message);
            continue;
          }
        } catch {
          texts.push(entry);
          continue;
        }
      }
      if (entry && typeof entry === 'object' && 'message' in entry) {
        const msg = (entry as { message?: string }).message;
        if (msg) texts.push(msg);
      }
    }
  } catch {
    texts.push(raw);
  }
  return texts;
}

export function parseFrappeError(error: unknown): string {
  const payload = getErrorPayload(error);
  if (payload && typeof payload._server_messages === 'string') {
    const messages = parseServerMessages(payload._server_messages);
    if (messages.length > 0) {
      return messages.join('\n');
    }
  }

  if (payload) {
    if (typeof payload.exception === 'string' && payload.exception) {
      return payload.exception;
    }
    if (typeof payload.message === 'string' && payload.message) {
      return payload.message;
    }
    if (typeof payload.exc === 'string' && payload.exc) {
      return payload.exc;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'An unexpected error occurred';
}

function markErrorDisplayed(error: unknown): void {
  if (error && typeof error === 'object') {
    Object.defineProperty(error, DISPLAYED_FLAG, {
      value: true,
      enumerable: false,
    });
  }
}

export function isFrappeErrorDisplayed(error: unknown): boolean {
  return Boolean(
    error && typeof error === 'object' && DISPLAYED_FLAG in (error as object)
  );
}

function isFrappeApiError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const payload = getErrorPayload(error);
  const direct = error as { httpStatus?: number };
  return (
    hasFrappeServerMessages(error) ||
    Boolean(payload?.exception) ||
    Boolean(payload?.exc_type) ||
    typeof direct.httpStatus === 'number'
  );
}

/** Show toast popup for Frappe API errors. Returns true if shown. */
export function showFrappeServerErrorPopup(error: unknown): boolean {
  if (!isFrappeApiError(error) || isFrappeErrorDisplayed(error)) {
    return false;
  }
  const message = parseFrappeError(error);
  // Defer so ToastContainer is mounted (e.g. during AuthGuard initial load).
  window.setTimeout(() => {
    showToast.error(message, 8000);
  }, 0);
  markErrorDisplayed(error);
  return true;
}

export async function withFrappeApiErrorHandling<T>(
  promise: Promise<T>
): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    showFrappeServerErrorPopup(error);
    throw error;
  }
}
