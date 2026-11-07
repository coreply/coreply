import type { CoreplyContext } from "../context";
import {
  cloudTokenSchema,
  cloudResponseSchema,
  cloudSuggestSchema,
} from "./cloud-protocol";
import type { ProviderInstance } from "./instance";

export class CoreplyCloudStatefulInstance implements ProviderInstance {
  private readonly cloudUrl: string | undefined;
  private socket: WebSocket | undefined;
  private connecting: Promise<WebSocket> | undefined;
  private disposed = false;
  private readonly pending = new Map<string, {
    resolve: (completion: string) => void;
    reject: (error: Error) => void;
  }>();

  constructor(cloudUrl: string | undefined) {
    this.cloudUrl = cloudUrl;
  }

  private async connect(baseUrl: URL): Promise<WebSocket> {
    if (this.disposed) throw new Error("Cloud provider is closed.");
    if (this.socket?.readyState === WebSocket.OPEN) return this.socket;
    if (this.connecting) return this.connecting;
    if (this.socket) {
      const previous = this.socket;
      this.disconnect(previous, new Error("Coreply Cloud disconnected."));
      previous.close();
    }

    const connection = this.openSocket(baseUrl);
    this.connecting = connection;
    try {
      return await connection;
    } finally {
      if (this.connecting === connection) this.connecting = undefined;
    }
  }

  private async openSocket(baseUrl: URL): Promise<WebSocket> {
    const response = await fetch(new URL("/api/auth/one-time-token/generate", baseUrl), {
      credentials: "include",
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Couldn't authenticate with Coreply Cloud. Check your sign-in status.");
    const { token } = cloudTokenSchema.parse(await response.json());
    if (this.disposed) throw new Error("Cloud provider is closed.");
    return new Promise((resolve, reject) => {
      const socketUrl = new URL("/api/suggestions/ws", baseUrl);
      socketUrl.protocol = baseUrl.protocol === "https:" ? "wss:" : "ws:";
      const socket = new WebSocket(socketUrl.href, ["coreply.token", token]);
      this.socket = socket;
      let opened = false;
      const fail = (error: Error) => {
        if (!opened) reject(error);
        this.disconnect(socket, error);
        socket.close();
      };
      socket.addEventListener("open", () => {
        if (this.disposed || this.socket !== socket) {
          fail(new Error("Cloud provider is closed."));
          return;
        }
        opened = true;
        resolve(socket);
      });
      socket.addEventListener("message", (event) => {
        if (this.socket !== socket) return;
        try {
          if (typeof event.data !== "string") throw new Error("Expected a JSON message.");
          const message = cloudResponseSchema.parse(JSON.parse(event.data));
          const pending = this.pending.get(message.id);
          if (!pending) return;
          this.pending.delete(message.id);
          if (message.type === "completion") pending.resolve(message.completion);
          else pending.reject(new Error(message.message));
        } catch {
          fail(new Error("Coreply Cloud sent an invalid response."));
        }
      });
      const disconnected = () => fail(new Error("Coreply Cloud disconnected. Check your connection and sign-in status."));
      socket.addEventListener("error", disconnected);
      socket.addEventListener("close", disconnected);
    });
  }

  private disconnect(socket: WebSocket, error: Error) {
    if (this.socket !== socket) return;
    this.socket = undefined;
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
  }

  async request(contexts: CoreplyContext[], typing: string): Promise<string> {
    if (this.disposed) throw new Error("Cloud provider is closed.");
    if (!this.cloudUrl) throw new Error("Coreply Cloud URL is not configured.");
    const baseUrl = new URL(this.cloudUrl);
    if (baseUrl.protocol !== "http:" && baseUrl.protocol !== "https:") {
      throw new Error("Coreply Cloud URL must use HTTP or HTTPS.");
    }
    // Capture snapshots before another request can mutate the context objects.
    const message = cloudSuggestSchema.parse({
      type: "suggest",
      id: crypto.randomUUID(),
      contexts: structuredClone(contexts.map((context) => context.toJSON())),
      typing,
    });
    const socket = await this.connect(baseUrl);
    if (this.disposed) throw new Error("Cloud provider is closed.");
    if (this.socket !== socket || socket.readyState !== WebSocket.OPEN) {
      throw new Error("Coreply Cloud disconnected before the request could be sent.");
    }
    return new Promise<string>((resolve, reject) => {
      this.pending.set(message.id, { resolve, reject });
      try {
        socket.send(JSON.stringify(message));
      } catch {
        this.disconnect(socket, new Error("Couldn't send the Coreply Cloud request."));
        socket.close();
      }
    });
  }

  dispose() {
    this.disposed = true;
    const error = new Error("Cloud provider is closed.");
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
    if (this.socket) {
      const socket = this.socket;
      this.disconnect(socket, error);
      socket.close();
    }
  }
}
