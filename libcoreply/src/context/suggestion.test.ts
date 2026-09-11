import { describe, expect, it } from "vitest";

import { PENDING, SuggestionStorage } from "./suggestion";

describe("SuggestionStorage", () => {
  it("treats PENDING as an exact current-typing key, not a shorter prefix", () => {
    const storage = new SuggestionStorage();

    storage.setSuggestionPending("hell");

    expect(storage.getSuggestion("hello")).toBeNull();
    expect(storage.getSuggestion("hell")).toBe(PENDING);
  });

  it("only clears pending for the exact current typing key", () => {
    const storage = new SuggestionStorage();

    storage.setSuggestionPending("hell");
    storage.setSuggestionPending("hello");
    storage.clearSuggestionPending("hello");

    expect(storage.getSuggestion("hell")).toBe(PENDING);
    expect(storage.getSuggestion("hello")).toBeNull();
  });

  it("stores valid suggestions without being blocked by an in-flight shorter prefix", () => {
    const storage = new SuggestionStorage();
    const typing = "hello";

    storage.setSuggestionPending("hel");
    const result = storage.updateSuggestion(typing, "hello world");

    expect(result).toBe(" world");
    expect(storage.getSuggestion(typing)).toBe(" world");
    expect(storage.getSuggestion("hel")).toBe(PENDING);
  });
});
