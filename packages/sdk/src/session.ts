import { generateId } from './id';

const SESSION_KEY = 'lumen_sid';

export function createSessionManager() {
  function getSessionId(): string {
    try {
      if (typeof sessionStorage !== 'undefined') {
        const existing = sessionStorage.getItem(SESSION_KEY);
        if (existing) return existing;
        const id = generateId();
        sessionStorage.setItem(SESSION_KEY, id);
        return id;
      }
    } catch {
      /* sessionStorage may throw in private/incognito mode */
    }
    return generateId();
  }

  function resetSession(): void {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(SESSION_KEY);
      }
    } catch {
      /* noop */
    }
  }

  return { getSessionId, resetSession };
}
