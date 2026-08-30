import { afterEach, describe, expect, it, vi } from "vitest";

import { requestSuggestions } from "../requests";
import { ChatContextImpl } from "../context/chat";
import { ScreenContextImpl } from "../context/screen";

function makeChatContext() {
  return new ChatContextImpl(
    "test-chat",
    { differentProfile: 0, sameProfile: 1 },
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
    "test-screen",
    { differentProfile: 0, sameProfile: 1 },
    {
      text: "Profile info",
      children: [{ text: "Status: online" }],
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
    expect(init.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer secret-token",
    });

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
          profileId: "test-chat",
          dropRule: { differentProfile: 0, sameProfile: 1 },
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
          label: "messages",
        },
        {
          type: "screen",
          profileId: "test-screen",
          dropRule: { differentProfile: 0, sameProfile: 1 },
          data: {
            text: "Profile info",
            children: [{ text: "Status: online" }],
          },
          label: "screen",
        },
      ],
      typing: "Working",
    });
    expect(body.contexts[0]).toHaveProperty("profileId", "test-chat");
    expect(body.contexts[0]).toHaveProperty("dropRule");
    expect(body.contexts[0]).toHaveProperty("label", "messages");
    expect(body.contexts[0]).not.toHaveProperty("suggestionStorage");
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
