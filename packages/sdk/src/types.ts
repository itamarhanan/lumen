export interface LumenConfig {
  siteId: string;
  ingestUrl: string;
  autoTrack?: boolean;
}

export interface LumenClient {
  pageview(url?: string, referrer?: string): void;
  event(name: string, properties?: EventProperties): void;
  identify(visitorId: string): void;
  resetSession(): void;
  destroy(): void;
}

export type EventProperties = Record<string, unknown>;

export interface BaseEvent {
  siteId: string;
  sessionId: string;
  visitorId: string;
  timestamp: number;
}

export interface PageviewEvent extends BaseEvent {
  type: 'pageview';
  url: string;
  referrer?: string;
}

export interface CustomEvent extends BaseEvent {
  type: 'custom';
  name: string;
  properties?: EventProperties;
}

export type LumenEvent = PageviewEvent | CustomEvent;
