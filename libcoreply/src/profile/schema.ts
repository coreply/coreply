import { z } from "zod";

const retentionSchema = z.union([
  z.number().int().nonnegative(),
  z.record(z.string(), z.number().int().nonnegative()),
]).meta({ control: "json" });

export const dropRuleSchema = z.object({
  differentProfile: retentionSchema,
  sameProfile: retentionSchema,
}).describe(/* i18n */ 'Enter either a number of recent contexts to keep or a JSON object mapping extractor labels to limits, e.g. {"chat": 1, "todoList": 2}').meta({ isAdvancedSettings: true });

export const sharedContextExtractorSchema = z.object({
  extractor: z.string().min(1).meta({ control: "textarea" }),
});

export const mustacheProfileSettingsSchema = {
  profile: z.object({
    appSpecificInstruction: z.string().optional().meta({ control: "textarea", textareaSize: "s" }),
  }),
  extractor: z.object({
    contextTemplate: z.string().optional().meta({ control: "textarea", textareaSize: "m", isAdvancedSettings: true }),
    contextTemplatePartial: z.string().optional().meta({ control: "textarea", textareaSize: "s", isAdvancedSettings: true }),
  }),
};

export const contextExtractorSchema = sharedContextExtractorSchema.extend(
  mustacheProfileSettingsSchema.extractor.shape,
);

export const sharedProfileSchema = z.object({
  id: z.string().min(1).meta({ enabled: false }),
  displayName: z.string().optional(),
  providerId: z.string().nullable().optional().meta({ show: false }),
  platform: z.enum(["android", "web"]).meta({ enabled: false }),
  matchingRule: z.string().min(1).refine((value) => {
    try {
      new RegExp(value);
      return true;
    } catch {
      return false;
    }
  }, "Invalid regular expression"),
});

export const profileSchema = sharedProfileSchema.extend({
  ...mustacheProfileSettingsSchema.profile.shape,
  dropRule: dropRuleSchema,
  contextExtractors: z.array(contextExtractorSchema),
});

export type DropRule = z.infer<typeof dropRuleSchema>;
export type ContextExtractor = z.infer<typeof contextExtractorSchema>;
export type Profile = z.infer<typeof profileSchema>;

export function matchesProfile(profile: Profile, platform: Profile["platform"], target: string) {
  return profile.platform === platform && new RegExp(profile.matchingRule).test(target);
}

export function exactPackageRule(packageName: string) {
  return `^${packageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`;
}
