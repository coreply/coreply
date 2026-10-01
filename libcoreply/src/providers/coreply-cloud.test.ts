import { afterEach, describe, expect, it, vi } from "vitest";

import { requestSuggestions } from "../requests";
import { ChatContextImpl } from "../context/chat";
import { ScreenContextImpl } from "../context/screen";
import type { Profile } from "../profile";

const chatProfile: Profile = {
  id: "test-chat",
  platform: "web",
  dropRule: { differentProfile: 0, sameProfile: 1 },
  extractors: [],
};

const screenProfile: Profile = {
  id: "test-screen",
  platform: "web",
  dropRule: { differentProfile: 0, sameProfile: 1 },
  extractors: [],
};

function makeChatContext() {
  return new ChatContextImpl(
    chatProfile,
    {
      id: "chat-1",
      title: "Alice",
      turns: [
        {
          sender: "Alice",
          userSent: false,
          messages: [{ body: "Hey there" }],
        },
        {
          userSent: true,
          messages: [{ body: "Hi" }],
        },
      ],
    },
    "messages",
  );
}

function makeScreenContext() {
  return new ScreenContextImpl(
    screenProfile,
    {
      text: "Profile info",
      children: [{ text: "Status: online", children: [] }],
    },
    "screen",
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("coreplyCloud provider", () => {
  it("posts V2 contexts and typing to the backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ completion: "Working on it now" }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const completion = await requestSuggestions(
      [makeChatContext(), makeScreenContext()],
      "Working",
      "coreplyCloud",
      {
        provider: {
          requestUrl: "https://coreply.p.nadles.com/completion",
          apiKey: "secret-token",
        },
      },
    );

    expect(completion).toBe("Working on it now");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://coreply.p.nadles.com/completion");
    expect(init.method).toBe("POST");
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toEqual(
      expect.stringMatching(/.+/),
    );

    const body = JSON.parse(String(init.body)) as {
      action: string;
      version: number;
      contexts: Array<Record<string, unknown>>;
      typing: string;
    };

    expect(body).toEqual({
      action: "completion",
      version: 2,
      contexts: [
        {
          type: "chat",
          data: {
            id: "chat-1",
            title: "Alice",
            turns: [
              {
                sender: "Alice",
                userSent: false,
                messages: [{ body: "Hey there" }],
              },
              {
                userSent: true,
                messages: [{ body: "Hi" }],
              },
            ],
          },
        },
        {
          type: "screen",
          data: {
            text: "Profile info",
            children: [{ text: "Status: online", children: [] }],
          },
        },
      ],
      typing: "Working",
    });
    expect(body.contexts[0]).not.toHaveProperty("profile");
    expect(body.contexts[0]).not.toHaveProperty("profileId");
    expect(body.contexts[0]).not.toHaveProperty("dropRule");
    expect(body.contexts[0]).not.toHaveProperty("label");
  });

  it("surfaces backend error messages", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Session limit exceeded." }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      requestSuggestions([], "", "coreplyCloud", {
        provider: {
          requestUrl: "https://coreply.p.nadles.com/completion",
          apiKey: "secret-token",
        },
      }),
    ).rejects.toThrow("Session limit exceeded.");
  });
});
