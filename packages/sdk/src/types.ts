export interface LumenConfig {
  siteId: string;
  ingestUrl: string;
  autoTrack?: boolean;
}

export interface LumenClient {
  pageview(url?: string, referrer?: string): void;
  event(name: string, properties?: EventProperties): void;
  identify(personId: string, properties?: EventProperties): void;
  setPersonProperties(properties: EventProperties): void;
  resetSession(): void;
  destroy(): void;
}

export type EventProperties = Record<string, unknown>;

interface BaseEvent {
  siteId: string;
  sessionId: string;
  visitorId: string;
  personId?: string;
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

export interface IdentifyEvent extends BaseEvent {
  type: 'identify';
  personId: string;
  properties?: EventProperties;
}

export type LumenEvent = PageviewEvent | CustomEvent | IdentifyEvent;
