import { z } from "zod";
import type { ScreenContextData } from "../context/screen";

export const cloudChatContextSchema = z.object({
  type: z.literal("chat"),
  data: z.object({
    id: z.string().optional(),
    title: z.string().optional(),
    turns: z.array(z.object({
      sender: z.string().optional(),
      userSent: z.boolean(),
      messages: z.array(z.object({
        body: z.string(),
        time: z.string().optional(),
        quote: z.string().optional(),
      })),
    })),
  }),
});

const screenContextDataSchema: z.ZodType<ScreenContextData> = z.lazy(() => z.object({
  text: z.string(),
  children: z.array(screenContextDataSchema),
}));

export const cloudContextSchema = z.discriminatedUnion("type", [
  cloudChatContextSchema,
  z.object({ type: z.literal("screen"), data: screenContextDataSchema }),
]);

export const cloudSuggestionInputSchema = z.object({
  contexts: z.array(cloudContextSchema),
  typing: z.string(),
});

export const cloudSuggestSchema = cloudSuggestionInputSchema.extend({
  type: z.literal("suggest"),
  id: z.string().min(1).max(128),
});

export const cloudTokenSchema = z.object({ token: z.string().regex(/^[a-zA-Z0-9_-]{32}$/) });

export const cloudResponseSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("completion"),
    id: z.string(),
    completion: z.string(),
  }),
  z.object({
    type: z.literal("error"),
    id: z.string(),
    message: z.string(),
  }),
]);

export type CloudResponse = z.infer<typeof cloudResponseSchema>;
