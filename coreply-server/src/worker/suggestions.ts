import { Hono } from "hono";
import { upgradeWebSocket } from "hono/cloudflare-workers";
import { HTTPException } from "hono/http-exception";
import {
  cloudSuggestionInputSchema,
  cloudSuggestSchema,
  type CloudResponse,
} from "libcoreply/src/providers/cloud-protocol";
import type { auth } from "./auth";
import { cloudOrigins } from "./origins";
import { requireSession } from "./session-middleware";

export const suggestionWebSocket = new Hono<{
  Bindings: Env;
  Variables: { session: typeof auth.$Infer.Session; connectionId: string };
}>()
  .use("*", async (c, next) => {
    const connectionId = crypto.randomUUID();
    c.set("connectionId", connectionId);
    const origin = c.req.header("Origin");
    const cookie = c.req.header("Cookie");
    console.info("Cloud WebSocket handshake received", {
      connectionId,
      origin,
      cookieHeaderPresent: cookie !== undefined,
      cookieNames: cookie?.split(";").map((entry) => entry.split("=", 1)[0].trim()),
    });
    if (!origin || !cloudOrigins.includes(origin)) {
      return c.json({ error: "Forbidden" }, 403);
    }
    if (c.req.method !== "GET" || c.req.header("Upgrade")?.toLowerCase() !== "websocket") {
      return c.json({ error: "A WebSocket upgrade is required." }, 426);
    }
    await next();
    console.info("Cloud WebSocket handshake response", { connectionId, status: c.res.status });
  })
  .use("*", requireSession)
  .get("/", upgradeWebSocket((c) => {
    const connectionId = c.get("connectionId");
    // Capture identity at the cookie-authenticated handshake. Open sockets do
    // not reauthenticate or change identity when the browser's session changes.
    const user = c.get("session").user;
    const session = c.env.SUGGESTION_SESSIONS.getByName(user.id);
    const pendingIds = new Set<string>();
    let closed = false;
    return {
      onMessage(event, ws) {
        if (closed) return;
        if (typeof event.data !== "string" || event.data.length > 2 * 1024 * 1024) {
          closed = true;
          ws.close(1009, "Invalid message size or type");
          return;
        }
        let request;
        try {
          request = cloudSuggestSchema.parse(JSON.parse(event.data));
        } catch {
          closed = true;
          ws.close(1008, "Invalid suggestion request");
          return;
        }
        if (pendingIds.has(request.id)) {
          closed = true;
          ws.close(1008, "Duplicate request");
          return;
        }
        pendingIds.add(request.id);
        const send = (response: CloudResponse) => {
          if (!closed && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(response));
        };
        const task = (async () => {
          try {
            const completion = await session.suggest(user, {
              contexts: request.contexts,
              typing: request.typing,
            });
            send({ type: "completion", id: request.id, completion });
          } catch (error) {
            console.error("Cloud WebSocket suggestion failed", { connectionId, requestId: request.id });
            send({
              type: "error",
              id: request.id,
              message: error instanceof Error ? error.message : "Couldn't generate a suggestion. Please try again.",
            });
          } finally {
            pendingIds.delete(request.id);
          }
        })().catch(() => {
          closed = true;
          ws.close(1011, "Connection failed");
        });
        c.executionCtx.waitUntil(task);
      },
      onClose(event) {
        closed = true;
        pendingIds.clear();
        console.info("Cloud WebSocket closed", { connectionId, code: event.code });
      },
      onError() {
        closed = true;
        pendingIds.clear();
        console.warn("Cloud WebSocket transport error", { connectionId });
      },
    };
  }))
  .onError((error, c) => {
    if (error instanceof HTTPException) return c.json({ error: error.message }, error.status);
    console.error("Cloud WebSocket connection failed", { connectionId: c.get("connectionId"), error: error.name });
    return c.json({ error: "Coreply Cloud is unavailable. Please try again." }, 503);
  });

// Mounted after the Worker's CORS and cookie-session middleware.
export const suggestions = new Hono<{
  Bindings: Env;
  Variables: { session: typeof auth.$Infer.Session };
}>()
  .post("/", async (c) => {
    c.header("Cache-Control", "private, no-store");
    const origin = c.req.header("Origin");
    if (origin && !cloudOrigins.includes(origin)) return c.json({ error: "Forbidden" }, 403);
    // JSON-only requests require a preflight from untrusted browser origins.
    // Extensions with host permission can legitimately omit the Origin header.
    if (c.req.header("Content-Type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
      return c.json({ error: "Content-Type must be application/json." }, 415);
    }
    let input;
    try {
      input = cloudSuggestionInputSchema.parse(await c.req.json());
    } catch {
      return c.json({ error: "Invalid suggestion request." }, 400);
    }
    const user = c.get("session").user;
    try {
      const session = c.env.SUGGESTION_SESSIONS.getByName(user.id);
      const completion = await session.suggest(user, input);
      return c.json({ completion });
    } catch (error) {
      console.error("Cloud HTTP suggestion failed");
      return c.json({
        error: error instanceof Error ? error.message : "Couldn't generate a suggestion. Please try again.",
      }, 502);
    }
  });
