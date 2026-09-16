import { z } from "zod";
import { coreplySettingsSchema } from "libcoreply";

const dropRuleCountSchema = z.union([
  z.number().int(),
  z.record(z.string(), z.number().int()),
]);

const dropRuleSchema = z.object({
  differentProfile: dropRuleCountSchema,
  sameProfile: dropRuleCountSchema,
});

const chatMessageSchema = z.object({
  body: z.string(),
  time: z.string().optional(),
  quote: z.string().optional(),
});

const chatTurnSchema = z.object({
  sender: z.string().optional(),
  userSent: z.boolean(),
  messages: z.array(chatMessageSchema),
});

const serializedChatContextSchema = z.object({
  type: z.literal("chat"),
  profileId: z.string(),
  dropRule: dropRuleSchema,
  label: z.string().optional(),
  data: z.object({
    id: z.string().optional(),
    title: z.string().optional(),
    turns: z.array(chatTurnSchema),
  }),
});

const screenContextDataSchema: z.ZodType<{
  text?: string;
  children?: { text?: string; children?: unknown[] }[];
}> = z.object({
  text: z.string().optional(),
  children: z.array(z.lazy(() => screenContextDataSchema)).optional(),
});

const serializedScreenContextSchema = z.object({
  type: z.literal("screen"),
  profileId: z.string(),
  dropRule: dropRuleSchema,
  label: z.string().optional(),
  data: screenContextDataSchema,
});

export const suggestionFetchLogSchema = z.object({
  type: z.literal("suggestionFetch"),
  providerId: z.string(),
  currentTyping: z.string(),
  startedAt: z.string(),
  completedAt: z.string(),
  durationMs: z.number().int().nonnegative(),
  contexts: z.array(
    z.discriminatedUnion("type", [
      serializedChatContextSchema,
      serializedScreenContextSchema,
    ]),
  ),
  result: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("success"),
      suggestion: z.string(),
    }),
    z.object({
      type: z.literal("error"),
      message: z.string(),
    }),
  ]),
});

export const wrapperInboundMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("settings"),
    payload: coreplySettingsSchema.required().partial(),
  }),
  z.object({
    type: z.literal("updateTyping"),
    payload: z.object({
      currentTyping: z.string(),
    }),
  }),
  // ** Added snapshotUpdated message type for handling snapshots from native
  z.object({
    type: z.literal("snapshotUpdated"),
    payload: z.object({
      snapshot: z.any(),
    }),
  }),
]);

export const wrapperOutboundMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("init"),
  }),
  z.object({
    type: z.literal("updateSuggestion"),
    payload: z.object({
      fullSuggestion: z.string(),
    }),
  }),
  z.object({
    type: z.literal("error"),
    payload: z.object({
      message: z.string(),
    }),
  }),
  z.object({
    type: z.literal("collectionModeUpdated"),
    payload: z.object({
      collectionMode: z.enum(["minimal", "frequent", "active"]),
    }),
  }),
  z.object({
    type: z.literal("log"),
    payload: suggestionFetchLogSchema,
  }),
]);

export type WrapperInboundMessage = z.infer<typeof wrapperInboundMessageSchema>;
export type WrapperOutboundMessage = z.infer<
  typeof wrapperOutboundMessageSchema
>;
export type SuggestionFetchLog = z.infer<typeof suggestionFetchLogSchema>;
