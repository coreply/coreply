import { z } from "zod";

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

export type SuggestionFetchLog = z.infer<typeof suggestionFetchLogSchema>;

export interface LibCoreplyListener {
  onCollectionModeUpdated: (
    collectionMode: "minimal" | "frequent" | "active",
  ) => void;
  onInit: () => void;
  onSuggestionUpdated: (fullSuggestion: string) => void;
  onSuggestionCleared: () => void;
  onError: (error: Error) => void;
  onLog: (log: SuggestionFetchLog) => void;
}
