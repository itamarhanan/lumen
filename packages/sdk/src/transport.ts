import type { LumenEvent, IdentifyPayload } from './types';

export type SendPayload = LumenEvent | IdentifyPayload;

export function createTransport(ingestUrl: string) {
  function send(event: SendPayload): void {
    const body = JSON.stringify(event);

    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      const queued = navigator.sendBeacon(ingestUrl, blob);
      if (queued) return;
    }
    fetch(ingestUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  }

  return { send };
}
