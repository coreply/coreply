import { describe, expect, it } from "vitest";

import { ScreenContextImpl } from "./screen";

describe("ScreenContextImpl.tryUpdate", () => {
  it("returns false instead of throwing on malformed incoming data", () => {
    const existing = new ScreenContextImpl(
      "profile",
      { differentProfile: 0, sameProfile: 1 },
      {
        text: "Profile",
        children: [{ text: "Status" }],
      },
    );
    const malformed = {
      data: {
        text: "Profile",
        children: [null],
      },
    } as unknown as ScreenContextImpl;

    expect(existing.tryUpdate(malformed)).toBe(false);
    expect(existing.data).toEqual({
      text: "Profile",
      children: [{ text: "Status" }],
    });
  });
});
