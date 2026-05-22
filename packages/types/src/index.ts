export type EventProperties = Record<string, unknown>;

export interface BaseEvent {
  siteId: string;
  sessionId: string;
  visitorId: string;
  timestamp: number;
}

export interface PageviewEvent extends BaseEvent {
  type: "pageview";
  url: string;
  referrer?: string;
}

export interface CustomEvent extends BaseEvent {
  type: "custom";
  name: string;
  properties?: EventProperties;
}

export type LumenEvent = PageviewEvent | CustomEvent;

export interface RedisEnvelope {
  raw: LumenEvent;
  receivedAt: number;
  ip?: string;
  userAgent?: string;
}
