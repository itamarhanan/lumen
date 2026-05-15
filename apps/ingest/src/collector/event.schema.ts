import { z } from 'zod';

const PropertyValue = z.union([z.string(), z.number(), z.boolean(), z.null()]);

const BaseEvent = z.object({
  siteId: z.string().min(1),
  sessionId: z.string().min(1),
  visitorId: z.string().min(1),
  timestamp: z.number().int().positive(),
});

export const PageviewEventSchema = BaseEvent.extend({
  type: z.literal('pageview'),
  url: z.url(),
  referrer: z.url().nullish(),
});

export const CustomEventSchema = BaseEvent.extend({
  type: z.literal('custom'),
  name: z.string().min(1),
  properties: z.record(z.string(), PropertyValue).optional(),
});

export const LumenEventSchema = z.discriminatedUnion('type', [
  PageviewEventSchema,
  CustomEventSchema,
]);

export type LumenEvent = z.infer<typeof LumenEventSchema>;
export type PageviewEvent = z.infer<typeof PageviewEventSchema>;
export type CustomEvent = z.infer<typeof CustomEventSchema>;
