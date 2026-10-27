import { Hono } from "hono";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { auth } from "./auth";
import { requireSession } from "./session-middleware";
import { billing } from "./billing";
import { suggestions, suggestionWebSocket } from "./suggestions";
import { cloudOrigins } from "./origins";
export { SuggestionSession } from "./suggestion-session";
const app = new Hono<{
  Bindings: Env;
  Variables: { session: typeof auth.$Infer.Session };
}>();

// Upgrade responses bypass header-modifying HTTP middleware. This route has
// its own explicit Origin allowlist and authenticates before upgrading.
app.route("/api/suggestions/ws", suggestionWebSocket);

app.use("/api/*", cors({
  origin: (origin, c) => {
    const allowed = c.req.path === "/api/suggestions" || c.req.path === "/api/suggestions/"
      ? cloudOrigins.includes(origin)
      : origin === c.env.CLOUD_WEB_ORIGIN;
    return allowed ? origin : "";
  },
  credentials: true,
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "expo-origin"],
}));

// Auth must stay public. Every application endpoint below requires a session.
app.all("/api/auth/*", (c) => auth.handler(c.req.raw));
app.use("/api/*", requireSession);
app.use("/api/*", csrf({
  origin: (origin, c) => origin === c.env.CLOUD_WEB_ORIGIN,
}));
app.route("/api/billing", billing);
app.route("/api/suggestions", suggestions);
app.get("/api/", (c) => c.json({ user: c.get("session").user }));

export default app;
