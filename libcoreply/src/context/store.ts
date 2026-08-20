import type { CoreplyContext } from ".";
import type { DropRule } from "../profile";
import { profileGroups } from "../profile";
import { SuggestionStorage } from "./suggestion";

/**
 * Central store that manages both contexts and suggestion storage
 * Exposes higher-level methods to control context and suggestion management
 */
export class ContextStore {
  private readonly suggestionStorage = new SuggestionStorage();
  private contexts: CoreplyContext[] = [];

  // ** Suggestion Storage methods (delegated)

  clearSuggestions() {
    this.suggestionStorage.clear();
  }

  getSuggestion(text: string): string | null {
    return this.suggestionStorage.getSuggestion(text);
  }

  updateSuggestion(currentTyping: string, suggestion: string): string | null {
    return this.suggestionStorage.updateSuggestion(currentTyping, suggestion);
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
        if (this.contexts[i].tryUpdate && this.contexts[i].tryUpdate(context as any)) {
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

    // ** Implemented drop rule logic
    // Apply drop rule based on the current profile's drop rule
    const dropRule = this.getDropRuleForProfile(context.profileId);
    if (dropRule) {
      this.applyDropRule(dropRule, context.profileId);
    }
  }

  getContexts(): CoreplyContext[] {
    return this.contexts;
  }

  clearContexts(): void {
    this.contexts = [];
  }

  // ** Helper method to get drop rule for a profile
  private getDropRuleForProfile(profileId: string): DropRule | null {
    for (const group of profileGroups) {
      for (const profile of group.profiles) {
        if (profile.id === profileId) {
          return profile.dropRule;
        }
      }
    }
    return null;
  }

  // ** Helper method to apply drop rule
  private applyDropRule(dropRule: DropRule, currentProfileId: string): void {
    const differentProfileRule = dropRule.differentProfile;
    const sameProfileRule = dropRule.sameProfile;

    // Handle differentProfile rule
    // If differentProfile is 0, remove all contexts from different profiles
    if (differentProfileRule === 0) {
      this.contexts = this.contexts.filter(
        (ctx) => ctx.profileId === currentProfileId,
      );
    } else if (typeof differentProfileRule === "number") {
      // If differentProfile is a number, keep only that many contexts from different profiles
      const differentProfileContexts = this.contexts.filter(
        (ctx) => ctx.profileId !== currentProfileId,
      );
      const sameProfileContexts = this.contexts.filter(
        (ctx) => ctx.profileId === currentProfileId,
      );

      // Keep only the latest N different profile contexts
      const keptDifferent = differentProfileContexts
        .sort((_a, _b) => {
          // Sort by some timestamp or order - for now, use array index as proxy
          // In practice, contexts should have a timestamp field
          return 0; // Placeholder - need proper sorting
        })
        .slice(-differentProfileRule);

      this.contexts = [...sameProfileContexts, ...keptDifferent];
    }

    // Handle sameProfile rule
    if (typeof sameProfileRule === "number") {
      // Keep only that many contexts from the same profile
      const sameProfileContexts = this.contexts.filter(
        (ctx) => ctx.profileId === currentProfileId,
      );
      const differentProfileContexts = this.contexts.filter(
        (ctx) => ctx.profileId !== currentProfileId,
      );

      // Keep only the latest N same profile contexts
      const keptSame = sameProfileContexts
        .sort((_a, _b) => {
          // Sort by some timestamp or order - newest first
          // In practice, contexts should have a timestamp field
          return 0; // Placeholder - need proper sorting
        })
        .slice(-sameProfileRule);

      this.contexts = [...keptSame, ...differentProfileContexts];
    } else if (typeof sameProfileRule === "object") {
      // sameProfile is a record with label/type -> count
      // Keep specified number of contexts per label/type
      const sameProfileContexts = this.contexts.filter(
        (ctx) => ctx.profileId === currentProfileId,
      );
      const differentProfileContexts = this.contexts.filter(
        (ctx) => ctx.profileId !== currentProfileId,
      );

      // Group same profile contexts by label or type
      const grouped = new Map<string, CoreplyContext[]>();
      for (const ctx of sameProfileContexts) {
        const key = ctx.label || ctx.type;
        if (!grouped.has(key)) {
          grouped.set(key, []);
        }
        grouped.get(key)!.push(ctx);
      }

      // For each group, keep only the specified number
      const keptSame: CoreplyContext[] = [];
      for (const [key, contexts] of grouped) {
        const maxCount = sameProfileRule[key] ?? 1;
        const sorted = contexts
          .sort((_a, _b) => {
            // Sort by some timestamp or order - newest first
            // In practice, contexts should have a timestamp field
            return 0; // Placeholder - need proper sorting
          })
          .slice(-maxCount);
        keptSame.push(...sorted);
      }

      this.contexts = [...keptSame, ...differentProfileContexts];
    }
  }

  // ** Combined clear method
  clearAll() {
    this.clearSuggestions();
    this.clearContexts();
  }
}
