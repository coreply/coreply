import { z } from "zod";
import { coreplySettingsSchema } from "libcoreply";

export const wrapperInboundMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("settings"),
    payload: coreplySettingsSchema.partial(),
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
]);

export type WrapperInboundMessage = z.infer<typeof wrapperInboundMessageSchema>;
export type WrapperOutboundMessage = z.infer<
  typeof wrapperOutboundMessageSchema
>;
