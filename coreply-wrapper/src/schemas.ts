import { z } from "zod";
import { coreplySettingsSchema } from "libcoreply";

export const suggestionFetchLogSchema = z.object({
  type: z.literal("suggestionFetch"),
  providerId: z.string(),
  currentTyping: z.string(),
  timestamp: z.string(),
  durationMs: z.number().int().nonnegative(),
  isGood: z.boolean(),
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
