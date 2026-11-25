import { env } from "cloudflare:workers";
import { expo } from "@better-auth/expo";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { Autumn } from "autumn-js";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { emailOTP } from "better-auth/plugins/email-otp";
import { oneTimeToken } from "better-auth/plugins/one-time-token";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./db/auth-schema";
import { cloudOrigins } from "./origins";
import { createSignInEmail } from "./sign-in-email";

function getTestLoginOTP(email: string, type: string) {
  if (type !== "sign-in") return;
  if (email !== env.LOGIN_EMAIL.trim().toLowerCase()) return;
  const otp = env.LOGIN_OTP;
  if (otp && /^\d{10}$/.test(otp)) return otp;
}

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
  advanced: { ipAddress: { ipAddressHeaders: ["CF-Connecting-IP"] } },
  disabledPaths: [
    "/email-otp/check-verification-otp",
    "/email-otp/verify-email",
    "/email-otp/request-password-reset",
    "/forget-password/email-otp",
    "/email-otp/reset-password",
    "/email-otp/request-email-change",
    "/email-otp/change-email",
  ],
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/email-otp/send-verification-otp") return;
      const { email, type } = ctx.body ?? {};
      if (type !== "sign-in" || typeof email !== "string")
        throw new APIError("BAD_REQUEST");
      const { success } = await env.LOGIN_EMAIL_LIMIT.limit({
        key: email.toLowerCase(),
      });
      if (!success) throw new APIError("TOO_MANY_REQUESTS");
    }),
  },
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
    emailOTP({
      otpLength: 10,
      expiresIn: 300,
      allowedAttempts: 3,
      storeOTP: "encrypted",
      generateOTP: ({ email, type }) => getTestLoginOTP(email, type),
      async sendVerificationOTP({ email, otp, type }) {
        if (type !== "sign-in" || getTestLoginOTP(email, type)) return;
        try {
          await env.EMAIL.send({
            to: email,
            from: { email: "login@noreply.coreply.app", name: "Coreply Cloud" },
            ...createSignInEmail(otp),
          });
        } catch (error) {
          console.error("Could not send Coreply Cloud code", error);
          throw new APIError("SERVICE_UNAVAILABLE", {
            message: "Could not send a sign-in code. Try again.",
          });
        }
      },
    }),
    oneTimeToken({ storeToken: "hashed", disableSetSessionCookie: true }),
  ],
});
