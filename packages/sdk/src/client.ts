import type { LumenConfig, LumenClient, EventProperties } from './types';
import type { PageviewEvent, CustomEvent, IdentifyEvent } from './types';
import { createSessionManager } from './session';
import { createTransport } from './transport';
import { createSpaListener } from './spa';
import { generateId } from './id';

const VISITOR_KEY = 'lumen_vid';
const PERSON_KEY = 'lumen_pid';

function getOrCreateVisitorId(): string {
  try {
    const existing = localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;
  } catch { /* empty */ }
  const id = generateId();
  try { localStorage.setItem(VISITOR_KEY, id); } catch { /* empty */ }
  return id;
}

function getPersonId(): string | undefined {
  try {
    return localStorage.getItem(PERSON_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function persistPersonId(id: string): void {
  try { localStorage.setItem(PERSON_KEY, id); } catch { /* empty */ }
}

export function createLumen(config: LumenConfig): LumenClient {
  const { siteId, ingestUrl, autoTrack = true } = config;
  const { getSessionId, resetSession } = createSessionManager();
  const { send } = createTransport(ingestUrl);

  const visitorId = getOrCreateVisitorId();
  let lastUrl: string | null = null;
  let lastReferrer: string | undefined = typeof document !== 'undefined' ? document.referrer || undefined : undefined;

  let spa: { destroy: () => void } | null = null;
  let personId = getPersonId();

  if (autoTrack) {
    spa = createSpaListener(() => trackPageview());
  }

  function buildBase() {
    return {
      siteId,
      sessionId: getSessionId(),
      visitorId,
      personId: personId ?? undefined,
      timestamp: Date.now(),
    };
  }

  function trackPageview(url?: string, referrer?: string) {
    const currentUrl = url ?? globalThis.location?.href ?? '';
    if (currentUrl === lastUrl) return;
    lastUrl = currentUrl;

    const event: PageviewEvent = {
      ...buildBase(),
      type: 'pageview',
      url: currentUrl,
      referrer: referrer ?? lastReferrer,
    };

    send(event);
    lastReferrer = currentUrl;
  }

  function trackCustom(name: string, properties?: EventProperties) {
    const event: CustomEvent = {
      ...buildBase(),
      type: 'custom',
      name,
      properties,
    };

    send(event);
  }

  function identify(id: string, properties?: EventProperties) {
    personId = id;
    persistPersonId(id);

    const event: IdentifyEvent = {
      ...buildBase(),
      type: 'identify',
      personId: id,
      properties,
    };

    send(event);
  }

  function setPersonProperties(properties: EventProperties) {
    if (!personId) return;

    const event: IdentifyEvent = {
      ...buildBase(),
      type: 'identify',
      personId: personId,
      properties,
    };

    send(event);
  }

  function destroy() {
    spa?.destroy();
  }

  if (autoTrack) {
    trackPageview();
  }

  return {
    pageview: trackPageview,
    event: trackCustom,
    identify,
    setPersonProperties,
    resetSession,
    destroy,
  };
}
