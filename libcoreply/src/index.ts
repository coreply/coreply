import debounce, { type DebouncedFunction } from "debounce";
import jsonata from "jsonata";
import Mustache from "mustache";
import { DEFAULT_GLOBAL_SETTINGS, type CoreplySettings } from "./settings";
import { type ChatMessage, ContextStore } from "./context";
import { profileGroups } from "./profile";
import { requestSuggestions } from "./requests";
import type { LibCoreplyListener } from "./listener";
import type { Snapshot } from "./context/snapshot";
import { ChatContextImpl } from "./context/chat";
import { ScreenContextImpl } from "./context/screen";

Mustache.escape = (value: string) => value;

export class Coreply {
  private settings: CoreplySettings = {
    globalSettings: DEFAULT_GLOBAL_SETTINGS,
    providerId: "openaiCompatible",
    providerConfig: {},
    selectedApps: [],
  };
  private readonly store = new ContextStore();
  private currentTyping = "";
  private readonly listener: LibCoreplyListener;
  private fetchSuggestionDebounced: DebouncedFunction<
    (typing: string, store: ContextStore) => void
  >;

  constructor(listener: LibCoreplyListener) {
    this.listener = listener;
    this.fetchSuggestionDebounced = this.createFetchSuggestionDebounced(350);
    this.listener.onInit();
  }

  private createFetchSuggestionDebounced(debounceMs: number) {
    return debounce((typing: string, store: ContextStore) => {
      void this.fetchSuggestion(typing, store);
    }, debounceMs);
  }

  getSettings(): CoreplySettings {
    return this.settings;
  }

  updateSettings(newSettings: Partial<CoreplySettings>) {
    this.settings = {
      ...this.settings,
      ...newSettings,
    };
    this.fetchSuggestionDebounced = this.createFetchSuggestionDebounced(
      this.settings.globalSettings.fetchControl.debounceMs,
    );
  }

  updateTyping(currentTyping: string) {
    if (currentTyping === this.currentTyping) {
      return;
    }
    this.currentTyping = currentTyping;
    this.emitSuggestion();
  }

  reset() {
    this.fetchSuggestionDebounced.clear();
    this.store.clearAll();
    this.listener.onSuggestionCleared();
  }

  // ** Implemented snapshotUpdated method to process snapshots and create contexts
  snapshotUpdated(snapshot: Snapshot) {
    const snapshotString = JSON.stringify(snapshot);
    const chunkSize = 4000;
    for (let i = 0; i < snapshotString.length; i += chunkSize) {
      const chunk = snapshotString.slice(i, i + chunkSize);
      if (i === 0) {
        console.log("Received snapshot:", chunk);
      } else {
        console.log(chunk);
      }
    }
    // Find matching profile groups based on platform and packageName/URL
    const platform = snapshot.platform;
    const packageName =
      platform === "android"
        ? (snapshot.snapshot.packageName ?? "")
        : snapshot.url;

    // Find matching profile groups
    const matchingGroups = profileGroups.filter((group) => {
      // Match rule against packageName or URL
      return packageName.includes(group.rule);
    });

    // Process each matching profile
    let collectionMode: "minimal" | "frequent" | "active" | null = null;
    for (const group of matchingGroups) {
      for (const profile of group.profiles) {
        // Run each extractor (JSONata expression) on the snapshot
        for (const jsonataExpr of profile.extractors) {
          try {
            // Run JSONata expression on snapshot to get context data
            // The JSONata result should be ChatContextData or ScreenContextData
            // ** Now using actual jsonata library to evaluate expressions
            this.runJsonata(snapshot, jsonataExpr).then((contextData) => {
              if (!contextData) {
                return;
              }

              // Extract collection mode from context data if present
              if (contextData.snapshotFrequency) {
                const freq = contextData.snapshotFrequency;
                if (
                  freq === "minimal" ||
                  freq === "frequent" ||
                  freq === "active"
                ) {
                  collectionMode = freq;
                  this.listener.onCollectionModeUpdated(freq);
                  // ** Collection mode is sent to native via onCollectionModeUpdated at line 168
                }
              }

              // Create context based on type
              let context;
              if (
                profile.platform === "android" ||
                profile.platform === "web"
              ) {
                // Determine context type from data or profile
                // Check type directly instead of using helper function
                if (contextData.type === "chat") {
                  context = new ChatContextImpl(
                    profile.id,
                    contextData,
                    contextData.label,
                  );
                } else if (contextData.type === "screen") {
                  context = new ScreenContextImpl(
                    profile.id,
                    contextData,
                    contextData.label,
                  );
                }
              }

              // Add to context store if context was created
              if (context) {
                // Pass the context data to addContext (which will call tryUpdate internally)
                this.store.addContext(context);
              }
              console.log(collectionMode);
            });
          } catch (error) {
            console.error(
              `Error processing extractor for profile ${profile.id}:`,
              JSON.stringify(error),
            );
          }
        }
      }
    }
  }

  // ** Implemented runJsonata using the jsonata library
  // ** Evaluates JSONata expression against snapshot to extract context data
  // ** Added debug logging for performance and evaluation results
  private async runJsonata(snapshot: Snapshot, jsonataExpr: string) {
    const expression = jsonata(jsonataExpr);
    const startTime = Date.now();
    const result = await expression.evaluate(snapshot.snapshot);
    const elapsed = Date.now() - startTime;
    const resultString = JSON.stringify(result);
    const chunkSize = 4000;
    for (let i = 0; i < resultString.length; i += chunkSize) {
      const chunk = resultString.slice(i, i + chunkSize);
      if (i === 0) {
        console.log(`JSONata evaluation completed in ${elapsed}ms`, chunk);
      } else {
        console.log(chunk);
      }
    }
    return result;
  }

  // ** Removed isChatContextData helper - now checking type directly

  private emitSuggestion() {
    if (!this.shouldSuggestForCurrentTyping(this.currentTyping, this.store)) {
      return;
    }
    const cached = this.store.getSuggestion(this.currentTyping);
    if (cached !== null) {
      this.listener.onSuggestionUpdated(`${this.currentTyping}${cached}`);
      return;
    }
    this.fetchSuggestionDebounced(this.currentTyping, this.store);
  }

  private shouldSuggestForCurrentTyping(
    typing: string,
    store: ContextStore,
  ): boolean {
    if (!typing && store.getContexts().length === 0) {
      // ** Check empty typing and empty contexts from store
      return false;
    }
    if (
      !this.settings.globalSettings.fetchControl.typingRegexEnabled ||
      !this.settings.globalSettings.fetchControl.typingRegexPattern
    ) {
      return true;
    }

    try {
      const regex = new RegExp(
        this.settings.globalSettings.fetchControl.typingRegexPattern,
      );
      return regex.test(typing);
    } catch {
      return true;
    }
  }

  private async fetchSuggestion(typing: string, store: ContextStore) {
    // ** Replaced typingInfo with typing string and store parameters
    try {
      const suggestion = await requestSuggestions(
        store.getContexts(),
        typing,
        this.settings.providerId,
        this.settings.providerConfig,
      );
      const normalized = suggestion.replace(/\n/g, " ");
      const finalSuggestion = normalized.startsWith(" ")
        ? ` ${normalized.trim()}`
        : normalized.trimEnd();
      // ** Changed to use store parameter instead of this.store
      const cached = store.updateSuggestion(typing, finalSuggestion);
      if (cached !== null) {
        this.listener.onSuggestionUpdated(`${typing}${cached}`);
      }
    } catch (error) {
      console.log("Error fetching suggestion:", error);
      this.listener.onError(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }
}

export * from "./settings";
export * from "./form-metadata";
export * from "./context";
export * from "./requests";
export * from "./providers";
export * from "./listener";
export * from "./profile";
