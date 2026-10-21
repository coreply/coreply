import { Hono } from "hono";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { auth } from "./auth";
import { requireSession } from "./session-middleware";
import { billing } from "./billing";
const app = new Hono<{
  Bindings: Env;
  Variables: { session: typeof auth.$Infer.Session };
}>();

app.use("/api/*", cors({
  origin: (origin, c) => origin === c.env.CLOUD_WEB_ORIGIN ? origin : "",
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
app.get("/api/", (c) => c.json({ user: c.get("session").user }));

export default app;
