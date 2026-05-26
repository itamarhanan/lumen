import { z } from 'zod';

const PropertyValue: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.record(z.string(), PropertyValue),
    z.array(PropertyValue),
  ]),
);

const BaseEvent = z.object({
  siteId: z.string().min(1),
  sessionId: z.string().min(1),
  visitorId: z.string().min(1),
  timestamp: z.number().int().positive(),
});

const PageviewEventSchema = BaseEvent.extend({
  type: z.literal('pageview'),
  url: z.url(),
  referrer: z.url().nullish(),
});

const CustomEventSchema = BaseEvent.extend({
  type: z.literal('custom'),
  name: z.string().min(1),
  properties: z.record(z.string(), PropertyValue).optional(),
});

export const IdentifyPayloadSchema = z.object({
  type: z.literal('identify'),
  siteId: z.string().min(1),
  sessionId: z.string().min(1),
  visitorId: z.string().min(1),
  timestamp: z.number().int().positive(),
  properties: z.record(z.string(), PropertyValue),
});

export type IdentifyPayload = z.infer<typeof IdentifyPayloadSchema>;

export const LumenEventSchema = z.discriminatedUnion('type', [
  PageviewEventSchema,
  CustomEventSchema,
]);

export type LumenEvent = z.infer<typeof LumenEventSchema>;
