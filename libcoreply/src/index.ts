import debounce, { type DebouncedFunction } from "debounce";
import { deepEqual } from "fast-equals";
import jsonata from "jsonata";
import Mustache from "mustache";
import { DEFAULT_GLOBAL_SETTINGS, type CoreplySettings } from "./settings";
import { ContextStore, PENDING } from "./context";
import { generateGenericProfile, matchesProfile } from "./profile";
import { createProviderInstance, type ProviderInstance } from "./providers";
import type { ProviderInstanceOptions } from "./providers/instance";
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
    profiles: [],
  };
  private readonly store = new ContextStore();
  private currentTyping: string | null = null;
  private snapshotRevision = 0;
  private readonly listener: LibCoreplyListener;
  private providerInstance: ProviderInstance;
  private readonly options: ProviderInstanceOptions | undefined;
  private fetchSuggestionDebounced: DebouncedFunction<
    (typing: string, store: ContextStore) => void
  >;

  constructor(listener: LibCoreplyListener, options?: ProviderInstanceOptions) {
    this.listener = listener;
    this.options = options;
    this.providerInstance = createProviderInstance(this.settings.providerId, this.options);
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
    const previous = this.settings;
    const next = { ...previous, ...newSettings };

    this.settings = next;

    if (
      previous.providerId !== next.providerId ||
      !deepEqual(previous.providerConfig, next.providerConfig)
    ) {
      this.providerInstance.dispose?.();
      this.providerInstance = createProviderInstance(next.providerId, this.options);
    }

    if (
      previous.globalSettings.fetchControl.debounceMs !==
      next.globalSettings.fetchControl.debounceMs
    ) {
      this.fetchSuggestionDebounced.clear();
      this.fetchSuggestionDebounced = this.createFetchSuggestionDebounced(
        next.globalSettings.fetchControl.debounceMs,
      );
    }
  }

  updateTyping(currentTyping: string) {
    if (currentTyping === this.currentTyping) {
      return;
    }
    this.currentTyping = currentTyping;
    this.emitSuggestion();
  }

  // ** Implemented snapshotUpdated method to process snapshots and create contexts
  snapshotUpdated(snapshot: Snapshot) {
    const revision = ++this.snapshotRevision;
    // Find matching profile groups based on platform and packageName/URL
    const platform = snapshot.platform;
    const target =
      platform === "android"
        ? (snapshot.snapshot.packageName ?? "")
        : snapshot.url;

    // Find matching profile groups
    const matchingProfiles = this.settings.profiles.filter((profile) =>
      this.settings.selectedApps.includes(profile.id) &&
      (platform !== "android" || profile.id === target) &&
      matchesProfile(profile, platform, target),
    );

    // Fallback: if the app is selected but has no predefined extractors,
    // dynamically generate a generic profile group for it.
    if (
      platform === "android" &&
      !this.settings.profiles.some((profile) => profile.platform === "android" && profile.id === target) &&
      this.settings.selectedApps.includes(target)
    ) {
      matchingProfiles.push(generateGenericProfile(target, target));
    }

    if (matchingProfiles.length === 0) {
      this.listener.onCollectionModeUpdated("minimal");
      return;
    }

    const extractorPromises: Promise<boolean>[] = [];

      for (const profile of matchingProfiles) {
        for (const contextExtractor of profile.contextExtractors) {
          extractorPromises.push(
            (async () => {
              try {
                const contextData = await this.runJsonata(
                  snapshot,
                  contextExtractor.extractor,
                );
                if (revision !== this.snapshotRevision) return false;
                const freq = contextData?.snapshotFrequency;
                if (freq === "minimal" || freq === "frequent" || freq === "active") {
                  this.listener.onCollectionModeUpdated(freq);
                }

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
                      profile,
                      contextData,
                      contextData.label,
                      contextExtractor,
                    );
                  } else if (contextData.type === "screen") {
                    context = new ScreenContextImpl(
                      profile,
                      contextData,
                      contextData.label,
                      contextExtractor,
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
                  error instanceof Error ? error.message : error,
                );
                return false;
              }
            })(),
          );
        }
      }
    void Promise.all(extractorPromises).then((results) => {
      if (revision !== this.snapshotRevision) return;
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
    if (resultString === undefined) return result;
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
    console.log(
      "Emit suggestion call for typing:",
      currentTyping,
      "Cached suggestion:",
      cached,
    );
    if (cached === PENDING) {
      return;
    }
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
    const startTime = Date.now();
    const contexts = [...store.getContexts()];

    try {
      store.setSuggestionPending(typing);
      const suggestion = await this.providerInstance.request(
        contexts,
        typing,
        this.settings.providerConfig,
      );
      const normalized = suggestion.replace(/\n/g, " ");
      const finalSuggestion = normalized.startsWith(" ")
        ? ` ${normalized.trim()}`
        : normalized.trimEnd();
      const cached = store.updateSuggestion(typing, finalSuggestion);
      if (this.settings.globalSettings.troubleshooting.saveLogs) {
        this.listener.onLog({
          type: "suggestionFetch",
          providerId: this.settings.providerId,
          currentTyping: typing,
          timestamp: new Date().toISOString(),
          durationMs: Date.now() - startTime,
          isGood: cached !== null && cached !== PENDING,
          result: {
            type: "success",
            suggestion: finalSuggestion,
          },
        });
      }
      if (cached !== null && cached !== PENDING) {
        this.listener.onSuggestionUpdated(`${typing}${cached}`);
      }
    } catch (error) {
      const resolvedError =
        error instanceof Error ? error : new Error(String(error));
      console.log("Error fetching suggestion:", resolvedError);
      if (this.settings.globalSettings.troubleshooting.saveLogs) {
        this.listener.onLog({
          type: "suggestionFetch",
          providerId: this.settings.providerId,
          currentTyping: typing,
          timestamp: new Date().toISOString(),
          durationMs: Date.now() - startTime,
          isGood: false,
          result: {
            type: "error",
            message: resolvedError.message,
          },
        });
      }
      this.listener.onError(resolvedError);
    } finally {
      store.clearSuggestionPending(typing);
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
