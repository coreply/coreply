// Schema generation runs in Node, not Workers. Use Wrangler's local D1 binding.
import { expo } from "@better-auth/expo";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { drizzle } from "drizzle-orm/d1";
import { getPlatformProxy } from "wrangler";
import * as schema from "./src/worker/db/auth-schema";

const { env } = await getPlatformProxy<Env>();

export const auth = betterAuth({
  database: drizzleAdapter(drizzle(env.DB, { schema }), { provider: "sqlite", schema }),
  plugins: [expo()],
});
