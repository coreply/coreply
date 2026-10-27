import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CoreplyCloudStatefulInstance } from "./coreply-cloud-stateful";
import { cloudSuggestSchema } from "./cloud-protocol";

class TestWebSocket extends EventTarget {
  static OPEN = 1;
  static instances: TestWebSocket[] = [];
  readyState = 0;
  readonly sent: string[] = [];
  readonly url: string;

  constructor(url: string) {
    super();
    this.url = url;
    TestWebSocket.instances.push(this);
  }

  open() {
    this.readyState = 1;
    this.dispatchEvent(new Event("open"));
  }

  fail() {
    this.readyState = 3;
    this.dispatchEvent(new Event("error"));
  }

  close() {
    if (this.readyState === 3) return;
    this.readyState = 3;
    this.dispatchEvent(new Event("close"));
  }

  send(data: string) {
    if (this.readyState !== 1) throw new Error("Socket is not open");
    this.sent.push(data);
  }

  respond(data: unknown) {
    this.dispatchEvent(new MessageEvent("message", { data: JSON.stringify(data) }));
  }
}

function latestSocket() {
  const socket = TestWebSocket.instances.at(-1);
  if (!socket) throw new Error("No WebSocket was constructed");
  return socket;
}

beforeEach(() => {
  TestWebSocket.instances.length = 0;
  vi.stubGlobal("WebSocket", TestWebSocket);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Coreply Cloud transport selection", () => {
  it("shares the initial WS attempt and permanently falls back to credentialed POST", async () => {
    const fetch = vi.fn().mockImplementation(async () => Response.json({ completion: "done" }));
    vi.stubGlobal("fetch", fetch);
    const provider = new CoreplyCloudStatefulInstance("http://localhost:5173");
    const first = provider.request([], "one");
    const second = provider.request([], "two");
    expect(TestWebSocket.instances).toHaveLength(1);
    latestSocket().fail();
    await expect(Promise.all([first, second])).resolves.toEqual(["done", "done"]);
    await expect(provider.request([], "three")).resolves.toBe("done");
    expect(TestWebSocket.instances).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch).toHaveBeenLastCalledWith(new URL("http://localhost:5173/api/suggestions"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contexts: [], typing: "three" }),
    });
    provider.dispose();
  });

  it("reuses an open socket and matches concurrent responses by request ID", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const provider = new CoreplyCloudStatefulInstance("https://cloud.example.com");
    const first = provider.request([], "one");
    const second = provider.request([], "two");
    const socket = latestSocket();
    expect(socket.url).toBe("wss://cloud.example.com/api/suggestions/ws");
    socket.open();
    await vi.waitFor(() => expect(socket.sent).toHaveLength(2));
    const [one, two] = socket.sent.map((data) => cloudSuggestSchema.parse(JSON.parse(data)));
    socket.respond({ type: "completion", id: two.id, completion: "second" });
    socket.respond({ type: "completion", id: one.id, completion: "first" });
    await expect(Promise.all([first, second])).resolves.toEqual(["first", "second"]);
    expect(TestWebSocket.instances).toHaveLength(1);
    expect(fetch).not.toHaveBeenCalled();
    provider.dispose();
  });

  it("does not switch to POST for a suggestion error on an established socket", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const provider = new CoreplyCloudStatefulInstance("http://localhost:5173");
    const request = provider.request([], "one");
    const rejected = expect(request).rejects.toThrow("Usage limit reached");
    const socket = latestSocket();
    socket.open();
    await vi.waitFor(() => expect(socket.sent).toHaveLength(1));
    const message = cloudSuggestSchema.parse(JSON.parse(socket.sent[0]));
    socket.respond({ type: "error", id: message.id, message: "Usage limit reached" });
    await rejected;
    expect(fetch).not.toHaveBeenCalled();
    const next = provider.request([], "two");
    await vi.waitFor(() => expect(socket.sent).toHaveLength(2));
    const nextMessage = cloudSuggestSchema.parse(JSON.parse(socket.sent[1]));
    socket.respond({ type: "completion", id: nextMessage.id, completion: "ok" });
    await expect(next).resolves.toBe("ok");
    expect(TestWebSocket.instances).toHaveLength(1);
    provider.dispose();
  });

  it("rejects disconnected requests without replay and tries WS again before falling back", async () => {
    const fetch = vi.fn().mockImplementation(async () => Response.json({ completion: "post" }));
    vi.stubGlobal("fetch", fetch);
    const provider = new CoreplyCloudStatefulInstance("http://localhost:5173");
    const request = provider.request([], "one");
    const rejected = expect(request).rejects.toThrow("disconnected");
    const socket = latestSocket();
    socket.open();
    await vi.waitFor(() => expect(socket.sent).toHaveLength(1));
    socket.close();
    await rejected;
    expect(fetch).not.toHaveBeenCalled();
    const next = provider.request([], "two");
    expect(TestWebSocket.instances).toHaveLength(2);
    latestSocket().fail();
    await expect(next).resolves.toBe("post");
    expect(fetch).toHaveBeenCalledTimes(1);
    provider.dispose();
  });

  it("reports both the WS failure and the POST error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () =>
      Response.json({ error: "Unauthorized" }, { status: 401 }),
    ));
    const provider = new CoreplyCloudStatefulInstance("http://localhost:5173");
    const request = provider.request([], "one");
    latestSocket().fail();
    await expect(request).rejects.toMatchObject({
      name: "AggregateError",
      message: "Coreply Cloud WebSocket connection and HTTP POST failed: Unauthorized",
      errors: [expect.any(Error), expect.objectContaining({ message: "Unauthorized" })],
    });
    provider.dispose();
  });
});
