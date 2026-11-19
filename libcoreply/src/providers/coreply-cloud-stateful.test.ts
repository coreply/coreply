import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CoreplyCloudStatefulInstance } from "./coreply-cloud-stateful";
import { cloudSuggestSchema } from "./cloud-protocol";

class TestWebSocket extends EventTarget {
  static OPEN = 1;
  static instances: TestWebSocket[] = [];
  readyState = 0;
  readonly sent: string[] = [];
  readonly url: string;
  readonly protocols: string[];

  constructor(url: string, protocols: string[]) {
    super();
    this.url = url;
    this.protocols = protocols;
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
  vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => Response.json({ token: "a".repeat(32) })));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Coreply Cloud WebSocket transport", () => {
  it("shares the initial connection and reports a WebSocket failure", async () => {
    const provider = new CoreplyCloudStatefulInstance("http://localhost:5173");
    const first = provider.request([], "one");
    const second = provider.request([], "two");
    const results = Promise.allSettled([first, second]);
    await vi.waitFor(() => expect(TestWebSocket.instances).toHaveLength(1));
    latestSocket().fail();
    expect((await results).map((result) => result.status)).toEqual(["rejected", "rejected"]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(new URL("http://localhost:5173/api/auth/one-time-token/generate"), {
      credentials: "include",
      cache: "no-store",
    });
    provider.dispose();
  });

  it("reuses an open socket and matches concurrent responses by request ID", async () => {
    const provider = new CoreplyCloudStatefulInstance("https://cloud.example.com");
    const first = provider.request([], "one");
    const second = provider.request([], "two");
    await vi.waitFor(() => expect(TestWebSocket.instances).toHaveLength(1));
    const socket = latestSocket();
    expect(socket.url).toBe("wss://cloud.example.com/api/suggestions/ws");
    expect(socket.protocols).toEqual(["coreply.token", "a".repeat(32)]);
    socket.open();
    await vi.waitFor(() => expect(socket.sent).toHaveLength(2));
    const [one, two] = socket.sent.map((data) => cloudSuggestSchema.parse(JSON.parse(data)));
    socket.respond({ type: "completion", id: two.id, completion: "second" });
    socket.respond({ type: "completion", id: one.id, completion: "first" });
    await expect(Promise.all([first, second])).resolves.toEqual(["first", "second"]);
    expect(TestWebSocket.instances).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(1);
    provider.dispose();
  });

  it("keeps the socket open after a suggestion error", async () => {
    const provider = new CoreplyCloudStatefulInstance("http://localhost:5173");
    const request = provider.request([], "one");
    const rejected = expect(request).rejects.toThrow("Usage limit reached");
    await vi.waitFor(() => expect(TestWebSocket.instances).toHaveLength(1));
    const socket = latestSocket();
    socket.open();
    await vi.waitFor(() => expect(socket.sent).toHaveLength(1));
    const message = cloudSuggestSchema.parse(JSON.parse(socket.sent[0]));
    socket.respond({ type: "error", id: message.id, message: "Usage limit reached" });
    await rejected;
    expect(fetch).toHaveBeenCalledTimes(1);
    const next = provider.request([], "two");
    await vi.waitFor(() => expect(socket.sent).toHaveLength(2));
    const nextMessage = cloudSuggestSchema.parse(JSON.parse(socket.sent[1]));
    socket.respond({ type: "completion", id: nextMessage.id, completion: "ok" });
    await expect(next).resolves.toBe("ok");
    expect(TestWebSocket.instances).toHaveLength(1);
    provider.dispose();
  });

  it("closes after 30 seconds with no pending requests and reconnects on demand", async () => {
    const provider = new CoreplyCloudStatefulInstance("http://localhost:5173");
    const first = provider.request([], "one");
    const second = provider.request([], "two");
    await vi.waitFor(() => expect(TestWebSocket.instances).toHaveLength(1));
    const socket = latestSocket();
    socket.open();
    await vi.waitFor(() => expect(socket.sent).toHaveLength(2));

    vi.useFakeTimers();
    const [one, two] = socket.sent.map((data) => cloudSuggestSchema.parse(JSON.parse(data)));
    socket.respond({ type: "completion", id: one.id, completion: "first" });
    vi.advanceTimersByTime(30_000);
    expect(socket.readyState).toBe(TestWebSocket.OPEN);

    socket.respond({ type: "completion", id: two.id, completion: "second" });
    await expect(Promise.all([first, second])).resolves.toEqual(["first", "second"]);
    vi.advanceTimersByTime(29_999);
    expect(socket.readyState).toBe(TestWebSocket.OPEN);

    const third = provider.request([], "three");
    await vi.advanceTimersByTimeAsync(1);
    expect(socket.readyState).toBe(TestWebSocket.OPEN);
    expect(socket.sent).toHaveLength(3);
    const three = cloudSuggestSchema.parse(JSON.parse(socket.sent[2]));
    socket.respond({ type: "completion", id: three.id, completion: "third" });
    await expect(third).resolves.toBe("third");
    vi.advanceTimersByTime(30_000);
    expect(socket.readyState).toBe(3);
    expect(fetch).toHaveBeenCalledTimes(1);
    vi.useRealTimers();

    const fourth = provider.request([], "four");
    await vi.waitFor(() => expect(TestWebSocket.instances).toHaveLength(2));
    const replacement = latestSocket();
    replacement.open();
    await vi.waitFor(() => expect(replacement.sent).toHaveLength(1));
    const four = cloudSuggestSchema.parse(JSON.parse(replacement.sent[0]));
    replacement.respond({ type: "completion", id: four.id, completion: "fourth" });
    await expect(fourth).resolves.toBe("fourth");
    expect(fetch).toHaveBeenCalledTimes(2);
    provider.dispose();
  });

  it("rejects disconnected requests without replay and obtains a fresh token on reconnect", async () => {
    const provider = new CoreplyCloudStatefulInstance("http://localhost:5173");
    const request = provider.request([], "one");
    const rejected = expect(request).rejects.toThrow("disconnected");
    await vi.waitFor(() => expect(TestWebSocket.instances).toHaveLength(1));
    const socket = latestSocket();
    socket.open();
    await vi.waitFor(() => expect(socket.sent).toHaveLength(1));
    socket.close();
    await rejected;
    expect(fetch).toHaveBeenCalledTimes(1);
    const next = provider.request([], "two");
    const rejectedNext = expect(next).rejects.toThrow("disconnected");
    await vi.waitFor(() => expect(TestWebSocket.instances).toHaveLength(2));
    latestSocket().fail();
    await rejectedNext;
    expect(fetch).toHaveBeenCalledTimes(2);
    provider.dispose();
  });

  it("reports token authentication failures without opening a socket", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () =>
      Response.json({ error: "Unauthorized" }, { status: 401 }),
    ));
    const provider = new CoreplyCloudStatefulInstance("http://localhost:5173");
    await expect(provider.request([], "one")).rejects.toThrow("Couldn't authenticate with Coreply Cloud");
    expect(TestWebSocket.instances).toHaveLength(0);
    provider.dispose();
  });
});
