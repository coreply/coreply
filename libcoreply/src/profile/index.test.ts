import jsonata from "jsonata";
import { describe, expect, it } from "vitest";
import { generateGenericProfile, builtInProfiles } from "./index";

function getProfile(id: string) {
  const profile = builtInProfiles.find((profile) => profile.id === id);
  if (!profile) {
    throw new Error(`Profile ${id} not found`);
  }
  return profile;
}

describe("screen extractors", () => {
  it("emits text and children on every generic screen node", async () => {
    const profile = generateGenericProfile("com.example.app", "Example");
    const result = await jsonata(profile.contextExtractors[0].extractor).evaluate({
      children: [
        { text: "Leaf" },
        { text: null, children: [{ text: "Nested" }] },
      ],
    });

    expect(result).toEqual({
      type: "screen",
      label: "screen",
      snapshotFrequency: "frequent",
      text: "",
      children: [
        { text: "Leaf", children: [] },
        { text: "", children: [{ text: "Nested", children: [] }] },
      ],
    });
  });

  it("does not create a generic context solely because empty text fields exist", async () => {
    const profile = generateGenericProfile("com.example.app", "Example");
    expect(await jsonata(profile.contextExtractors[0].extractor).evaluate({ children: [{ text: "" }] })).toBeNull();
  });

  it("emits required fields in the Tinder screen tree", async () => {
    const profile = getProfile("com.tinder");
    const result = await jsonata(profile.contextExtractors[1].extractor).evaluate({
      children: [{ id: "com.tinder:id/user_rec_sparks_profile", children: [{ text: "Profile" }] }],
    });

    expect(result).toEqual({
      type: "screen",
      label: "user_profile",
      snapshotFrequency: "frequent",
      text: "",
      children: [{ text: "Profile", children: [] }],
    });
  });

  it("emits empty children for the Perplexity search composer", async () => {
    const profile = getProfile("ai.perplexity.app.android");
    const result = await jsonata(profile.contextExtractors[0].extractor).evaluate({
      children: [{ id: "input-search", isFocused: true }, { id: "home-screen" }],
    });

    expect(result).toEqual({
      type: "screen",
      label: "search",
      snapshotFrequency: "active",
      text: "Perplexity search composer",
      children: [],
    });
  });
});
