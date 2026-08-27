import debounce, { type DebouncedFunction } from "debounce";
import jsonata from "jsonata";
import Mustache from "mustache";
import { DEFAULT_GLOBAL_SETTINGS, type CoreplySettings } from "./settings";
import { ContextStore } from "./context";
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
  private currentTyping: string | null = null;
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
    this.currentTyping = null;
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
      return packageName === group.rule;
    });

    if (matchingGroups.length === 0) {
      this.listener.onCollectionModeUpdated("minimal");
      return;
    }

    const extractorPromises: Promise<boolean>[] = [];

    for (const group of matchingGroups) {
      for (const profile of group.profiles) {
        for (const jsonataExpr of profile.extractors) {
          extractorPromises.push(
            (async () => {
              try {
                const contextData = await this.runJsonata(snapshot, jsonataExpr);
                const freq =
                  contextData?.snapshotFrequency === "minimal" ||
                  contextData?.snapshotFrequency === "frequent" ||
                  contextData?.snapshotFrequency === "active"
                    ? contextData.snapshotFrequency
                    : "minimal";

                this.listener.onCollectionModeUpdated(freq);
                console.log(freq);

                if (!contextData) {
                  return false;
                }

                let context;
                if (
                  profile.platform === "android" ||
                  profile.platform === "web"
                ) {
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

                if (context) {
                  this.store.addContext(context);
                }

                if (freq === "active") {
                  this.emitSuggestion();
                }

                return true;
              } catch (error) {
                console.error(
                  `Error processing extractor for profile ${profile.id}:`,
                  JSON.stringify(error),
                );
                return false;
              }
            })(),
          );
        }
      }
    }

    void Promise.all(extractorPromises).then((results) => {
      const hasContext = results.some((foundContext) => foundContext);
      if (!hasContext) {
        this.listener.onCollectionModeUpdated("minimal");
      }
    });
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
    const currentTyping = this.currentTyping ?? "";
    if (!this.shouldSuggestForCurrentTyping(currentTyping, this.store)) {
      return;
    }
    const cached = this.store.getSuggestion(currentTyping);
    if (cached !== null) {
      this.listener.onSuggestionUpdated(`${currentTyping}${cached}`);
      return;
    }
    this.fetchSuggestionDebounced(currentTyping, this.store);
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
