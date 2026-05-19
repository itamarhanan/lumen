import type { LumenConfig, LumenClient, EventProperties } from './types';
import type { PageviewEvent, CustomEvent } from './types';
import { createSessionManager } from './session';
import { createTransport } from './transport';
import { createSpaListener } from './spa';
import { generateId } from './id';

export function createLumen(config: LumenConfig): LumenClient {
  const { siteId, ingestUrl, autoTrack = true } = config;
  const { getSessionId, resetSession } = createSessionManager();
  const { send } = createTransport(ingestUrl);

  let visitorId = generateId();
  let lastUrl: string | null = null;

  let spa: { destroy: () => void } | null = null;

  if (autoTrack) {
    spa = createSpaListener(() => trackPageview());
  }

  function trackPageview(url?: string, referrer?: string) {
    const currentUrl = url ?? globalThis.location?.href ?? '';
    if (currentUrl === lastUrl) return;
    lastUrl = currentUrl;

    const event: PageviewEvent = {
      siteId,
      type: 'pageview',
      sessionId: getSessionId(),
      visitorId,
      timestamp: Date.now(),
      url: currentUrl,
      referrer: referrer ?? (typeof document !== 'undefined' ? document.referrer || undefined : undefined),
    };

    send(event);
  }

  function trackCustom(name: string, properties?: EventProperties) {
    const event: CustomEvent = {
      siteId,
      type: 'custom',
      sessionId: getSessionId(),
      visitorId,
      timestamp: Date.now(),
      name,
      properties,
    };

    send(event);
  }

  function identify(id: string) {
    visitorId = id;
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
    resetSession,
    destroy,
  };
}
