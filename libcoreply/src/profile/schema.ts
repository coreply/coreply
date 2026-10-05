import { z } from "zod";

const retentionSchema = z.union([
  z.number().int().nonnegative(),
  z.record(z.string(), z.number().int().nonnegative()),
]).meta({ control: "json" }).describe("A context count, or a JSON object mapping context labels to counts");

export const dropRuleSchema = z.object({
  differentProfile: retentionSchema,
  sameProfile: retentionSchema,
});

export const contextExtractorSchema = z.object({
  extractor: z.string().min(1).meta({ control: "textarea" }),
  contextTemplate: z.string().optional().meta({ control: "textarea", textareaSize: "m" }),
  contextTemplatePartial: z.string().optional().meta({ control: "textarea", textareaSize: "s" }),
});

export const profileSchema = z.object({
  id: z.string().min(1).meta({ enabled: false }),
  displayName: z.string().optional(),
  platform: z.enum(["android", "web"]).meta({ enabled: false }),
  matchingRule: z.string().min(1).refine((value) => {
    try {
      new RegExp(value);
      return true;
    } catch {
      return false;
    }
  }, "Invalid regular expression"),
  appSpecificInstruction: z.string().optional().meta({ control: "textarea" }),
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
