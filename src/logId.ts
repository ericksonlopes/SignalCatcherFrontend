let sequence = 0;

/** UI-only log IDs also work when randomUUID is unavailable (for example over HTTP). */
export function createLogId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  sequence += 1;
  return `log-${Date.now().toString(36)}-${sequence.toString(36)}`;
}
