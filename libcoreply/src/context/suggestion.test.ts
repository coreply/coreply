import { describe, expect, it } from "vitest";

import { PENDING, SuggestionStorage } from "./suggestion";

describe("SuggestionStorage.updateSuggestion", () => {
  it("clears the pending marker when the incoming suggestion is rejected", () => {
    const storage = new SuggestionStorage();
    const typing = "hello";

    storage.setSuggestionPending(typing);

    expect(storage.updateSuggestion(typing, "goodbye")).toBeNull();
    expect(storage.getSuggestion(typing)).toBeNull();
  });

  it("clears stale pending markers from the prefix chain before returning a valid suggestion", () => {
    const storage = new SuggestionStorage() as any;
    const typing = "hello";

    storage.history.set("hell", PENDING);
    storage.history.set("hello", " world");

    const result = storage.updateSuggestion(typing, "hello world");

    expect(result).toBe(" world");
    expect(storage.getSuggestion(typing)).toBe(" world");
    expect(storage.history.get("hell")).toBeUndefined();
  });
});
