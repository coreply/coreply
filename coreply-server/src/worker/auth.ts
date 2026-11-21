import { env } from "cloudflare:workers";
import { expo } from "@better-auth/expo";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { Autumn } from "autumn-js";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { oneTimeToken } from "better-auth/plugins/one-time-token";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./db/auth-schema";
import { cloudOrigins } from "./origins";

export const auth = betterAuth({
  baseURL: env.CLOUD_WEB_ORIGIN,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(drizzle(env.DB, { schema }), {
    provider: "sqlite",
    schema,
  }),
  user: {
    deleteUser: {
      enabled: true,
      beforeDelete: async (user) => {
        const autumn = new Autumn({
          secretKey: env.AUTUMN_SECRET_KEY,
          xApiVersion: "2.3.0",
        });
        const customer = await autumn.customers.get({ customerId: user.id });
        if (
          customer.subscriptions.some(
            (subscription) =>
              subscription.planId !== "free" &&
              (subscription.status !== "active" ||
                subscription.canceledAt === null),
          )
        ) {
          throw new APIError("BAD_REQUEST", {
            message:
              "Cancel any active paid subscriptions and remove any scheduled paid plans before deleting your account.",
          });
        }
      },
      afterDelete: async (user) => {
        const autumn = new Autumn({
          secretKey: env.AUTUMN_SECRET_KEY,
          xApiVersion: "2.3.0",
        });
        try {
          await autumn.customers.delete({ customerId: user.id });
        } catch (error) {
          console.error(
            "Failed to delete Autumn customer after account deletion",
            { customerId: user.id, error },
          );
        }
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const autumn = new Autumn({
            secretKey: env.AUTUMN_SECRET_KEY,
            xApiVersion: "2.3.0",
          });
          await autumn.customers.getOrCreate({
            customerId: user.id,
            name: user.name,
            email: user.email,
          });
        },
      },
    },
  },
  trustedOrigins: [...cloudOrigins, "coreplyapp://"],
  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
    google: {
      clientId: [env.GOOGLE_CLIENT_ID, env.GOOGLE_ANDROID_CLIENT_ID],
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  plugins: [
    expo(),
    oneTimeToken({ storeToken: "hashed", disableSetSessionCookie: true }),
  ],
});
