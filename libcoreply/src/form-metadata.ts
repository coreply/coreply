export type CoreplyUiRuleEffect = "HIDE" | "SHOW" | "ENABLE" | "DISABLE";

export interface CoreplyUiRuleCondition {
  field?: string;
  scope?: string;
  schema: Record<string, unknown>;
  failWhenUndefined?: boolean;
}

export interface CoreplyUiRule {
  effect: CoreplyUiRuleEffect;
  condition: CoreplyUiRuleCondition;
}

interface CoreplyRuleOptions {
  failWhenUndefined?: boolean;
}

export function createFieldRule(
  effect: CoreplyUiRuleEffect,
  field: string,
  schema: Record<string, unknown>,
  options?: CoreplyRuleOptions,
) {
  return {
    "x-coreply-rule": {
      effect,
      condition: {
        field,
        schema,
        ...(options?.failWhenUndefined === undefined
          ? {}
          : { failWhenUndefined: options.failWhenUndefined }),
      },
    } satisfies CoreplyUiRule,
  } as const;
}

export function disableWhenFieldMatches(
  field: string,
  schema: Record<string, unknown>,
  options?: CoreplyRuleOptions,
) {
  return createFieldRule("DISABLE", field, schema, options);
}

export function disableWhenFieldIs(
  field: string,
  expectedValue: unknown,
  options?: CoreplyRuleOptions,
) {
  return disableWhenFieldMatches(field, { const: expectedValue }, options);
}

export function disableWhenFieldFalse(
  field: string,
  options?: CoreplyRuleOptions,
) {
  return disableWhenFieldIs(field, false, options);
}
