export function parseFrappeError(error: unknown): string {
  if (error && typeof error === 'object' && '_server_messages' in error) {
    const raw = (error as { _server_messages?: string })._server_messages;
    if (typeof raw === 'string') {
      try {
        const messages = JSON.parse(raw);
        const first = JSON.parse(messages[0]);
        if (first?.message) return first.message;
      } catch {
        // fall through
      }
    }
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
}
