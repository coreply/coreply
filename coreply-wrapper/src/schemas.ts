import { z } from "zod";
import { chatMessageSchema } from "libcoreply";
import { settingsSchema } from "libcoreply";

export const wrapperInboundMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("settings"), payload: settingsSchema }),
  z.object({
    type: z.literal("ingestMessages"),
    payload: z.object({
      messages: z.array(chatMessageSchema),
      pkgName: z.string().optional(),
    }),
  }),
  z.object({
    type: z.literal("updateTyping"),
    payload: z.object({
      currentTyping: z.string(),
    }),
  }),
  z.object({
    type: z.literal("reset"),
  }),
]);

export const wrapperOutboundMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("init"),
  }),
  z.object({
    type: z.literal("updateSuggestion"),
    payload: z.object({
      suggestion: z.string(),
    }),
  }),
  z.object({
    type: z.literal("error"),
    payload: z.object({
      message: z.string(),
    }),
  }),
]);

export type WrapperInboundMessage = z.infer<typeof wrapperInboundMessageSchema>;
export type WrapperOutboundMessage = z.infer<
  typeof wrapperOutboundMessageSchema
>;
