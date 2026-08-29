import type { CoreplyContext } from ".";
import type { DropRule } from "../profile";

/**
 * Central store that manages contexts
 * Exposes higher-level methods to control context and suggestion management
 */
export class ContextStore {
  private contexts: CoreplyContext[] = [];

  getSuggestion(text: string): string | null {
    const latestContext = this.contexts.at(-1);
    return latestContext?.getSuggestion(text) ?? null;
  }

  updateSuggestion(currentTyping: string, suggestion: string): string | null {
    const latestContext = this.contexts.at(-1);
    return latestContext?.updateSuggestion(currentTyping, suggestion) ?? null;
  }

  // ** Context Management methods

  addContext(context: CoreplyContext): void {
    console.log(
      `Adding context for profileId: ${context.profileId}, type: ${context.type}, label: ${context.label}`,
    );
    // Try to update existing contexts of the same type and profile
    let updated = false;
    for (let i = 0; i < this.contexts.length; i++) {
      if (
        this.contexts[i].type === context.type &&
        this.contexts[i].profileId === context.profileId
      ) {
        if (
          this.contexts[i].tryUpdate &&
          this.contexts[i].tryUpdate(context as any)
        ) {
          // Move the updated element to the end of the array
          const [updatedContext] = this.contexts.splice(i, 1);
          this.contexts.push(updatedContext);
          updated = true;
          break;
        }
      }
    }

    // If no existing context took the update, add as new context
    if (!updated) {
      this.contexts.push(context);
    }

    // Apply drop rule from the context's own profile
    this.applyDropRule(context.dropRule, context.profileId);
  }

  getContexts(): CoreplyContext[] {
    return this.contexts;
  }

  clearContexts(): void {
    this.contexts = [];
  }

  clearSuggestions(): void {
    for (const context of this.contexts) {
      context.clearSuggestions();
    }
  }

  // ** Helper method to apply drop rule
  private applyDropRule(dropRule: DropRule, currentProfileId: string): void {
    const kept: CoreplyContext[] = [];
    let sameProfileKept = 0;
    let differentProfileKept = 0;
    const sameProfileLabelCounts: Record<string, number> = {};
    const differentProfileLabelCounts: Record<string, number> = {};

    for (let i = this.contexts.length - 1; i >= 0; i--) {
      const context = this.contexts[i];
      const isSameProfile = context.profileId === currentProfileId;
      const key = context.label || "default-label";
      if (isSameProfile) {
        if (typeof dropRule.sameProfile === "number") {
          if (sameProfileKept >= dropRule.sameProfile) {
            continue;
          }
          sameProfileKept += 1;
        } else {
          const currentCount = sameProfileLabelCounts[key] ?? 0;
          const maxCount = dropRule.sameProfile[key] ?? 1;
          if (currentCount >= maxCount) {
            continue;
          }
          sameProfileLabelCounts[key] = currentCount + 1;
        }
      } else {
        if (typeof dropRule.differentProfile === "number") {
          if (differentProfileKept >= dropRule.differentProfile) {
            continue;
          }
          differentProfileKept += 1;
        } else {
          const currentCount = differentProfileLabelCounts[key] ?? 0;
          const maxCount = dropRule.differentProfile[key] ?? 0;
          if (currentCount >= maxCount) {
            continue;
          }
          differentProfileLabelCounts[key] = currentCount + 1;
        }
      }

      kept.push(context);
    }

    this.contexts = kept.reverse();
  }

  // ** Combined clear method
  clearAll() {
    this.clearSuggestions();
    this.clearContexts();
  }
}
