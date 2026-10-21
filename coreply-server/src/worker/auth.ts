import { env } from "cloudflare:workers";
import { expo } from "@better-auth/expo";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./db/auth-schema";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(drizzle(env.DB, { schema }), {
    provider: "sqlite",
    schema,
  }),
  trustedOrigins: [
    env.CLOUD_WEB_ORIGIN,
    "coreplyapp://",
    "chrome-extension://nmfnmclpahgpkgaaigpnclioncflbmhp",
  ],
  socialProviders: {
    google: {
      clientId: [
        env.GOOGLE_CLIENT_ID,
        env.GOOGLE_ANDROID_CLIENT_ID,
        env.GOOGLE_EXTENSION_CLIENT_ID,
      ],
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  plugins: [expo()],
});
