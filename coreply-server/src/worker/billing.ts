import { Autumn, type Customer, type Plan } from "autumn-js";
import type { User } from "better-auth";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

export const featureId = "standard_ai_usage";

export function customerUsage(customer: Customer) {
  const monthly = customer.balances[featureId];
  const daily = customer.billingControls.usageLimits?.find(
    (limit) => limit.featureId === featureId && limit.interval === "day" && limit.enabled && !limit.filter,
  );
  if (!monthly || monthly.granted <= 0 || !daily || daily.limit <= 0 || daily.usage === undefined) {
    throw new HTTPException(502, { message: "Usage information is unavailable. Please try again." });
  }
  return {
    monthly: { allowance: monthly.granted, remaining: monthly.remaining, used: monthly.usage },
    daily: { allowance: daily.limit, remaining: Math.max(0, daily.limit - daily.usage), used: daily.usage },
  };
}

function currentSubscription(customer: Customer) {
  const subscriptions = customer.subscriptions.filter(
    (subscription) => subscription.status === "active" && !subscription.addOn &&
      (subscription.planId === "free" || subscription.planId === "plus"),
  );
  if (subscriptions.length !== 1) {
    throw new HTTPException(502, { message: "Your subscription could not be loaded. Please try again." });
  }
  return subscriptions[0];
}

function planSummary(plan: Plan) {
  const monthly = plan.items.find((item) => item.featureId === featureId && item.reset?.interval === "month");
  const daily = plan.billingControls?.usageLimits?.find(
    (limit) => limit.featureId === featureId && limit.interval === "day" && limit.enabled !== false && !limit.filter,
  );
  if (monthly?.included === undefined || monthly.included <= 0 || !daily || daily.limit <= 0) {
    throw new HTTPException(502, { message: "Plan details are unavailable. Please try again." });
  }
  return {
    id: plan.id,
    name: plan.name,
    price: plan.price === null ? null : { amount: plan.price.amount, interval: plan.price.interval },
    monthlyAllowance: monthly.included,
    dailyCap: daily.limit,
  };
}

export const billing = new Hono<{
  Bindings: { AUTUMN_SECRET_KEY: string; CLOUD_WEB_ORIGIN: string };
  Variables: { session: { user: User } };
}>()
  .use("*", async (c, next) => {
    c.header("Cache-Control", "private, no-store");
    if (!c.env.AUTUMN_SECRET_KEY) {
      return c.json({ error: "Billing isn't configured yet." }, 503);
    }
    await next();
  })
  .get("/", async (c) => {
    const autumn = new Autumn({ secretKey: c.env.AUTUMN_SECRET_KEY, xApiVersion: "2.3.0" });
    const user = c.get("session").user;
    const [customer, free, plus] = await Promise.all([
      autumn.customers.getOrCreate({ customerId: user.id, name: user.name, email: user.email }),
      autumn.plans.get({ planId: "free" }),
      autumn.plans.get({ planId: "plus" }),
    ]);
    const subscription = currentSubscription(customer);
    const usage = customerUsage(customer);
    const plans = [planSummary(free), planSummary(plus)];
    const plan = plans.find((item) => item.id === subscription.planId);
    if (!plan) throw new HTTPException(502, { message: "Your plan is unavailable." });
    return c.json({
      plan,
      plans,
      ...usage,
      subscription: {
        pastDue: subscription.pastDue,
        canceled: subscription.canceledAt !== null,
      },
      canManageBilling: customer.stripeId !== null,
    });
  })
  .post("/upgrade", async (c) => {
    const autumn = new Autumn({ secretKey: c.env.AUTUMN_SECRET_KEY, xApiVersion: "2.3.0" });
    const user = c.get("session").user;
    const customer = await autumn.customers.getOrCreate({ customerId: user.id, name: user.name, email: user.email });
    if (currentSubscription(customer).planId === "plus") {
      return c.json({ error: "You already have Plus. Manage your subscription instead." }, 409);
    }
    const result = await autumn.billing.attach({
      customerId: user.id,
      planId: "plus",
      redirectMode: "always",
      successUrl: new URL("/billing?checkout=success", c.env.CLOUD_WEB_ORIGIN).href,
    });
    if (!result.paymentUrl) throw new HTTPException(502, { message: "Checkout is unavailable. Please try again." });
    return c.json({ url: result.paymentUrl });
  })
  .post("/portal", async (c) => {
    const autumn = new Autumn({ secretKey: c.env.AUTUMN_SECRET_KEY, xApiVersion: "2.3.0" });
    const customerId = c.get("session").user.id;
    const customer = await autumn.customers.get({ customerId });
    if (!customer.stripeId) return c.json({ error: "No billing account exists yet. Upgrade to Plus first." }, 409);
    const result = await autumn.billing.openCustomerPortal({
      customerId,
      returnUrl: new URL("/billing", c.env.CLOUD_WEB_ORIGIN).href,
    });
    return c.json({ url: result.url });
  })
  .onError((error, c) => {
    if (error instanceof HTTPException) return c.json({ error: error.message }, error.status);
    console.error("Autumn billing request failed", error.name);
    return c.json({ error: "Couldn't connect to billing. Please try again." }, 502);
  });

export type BillingApi = typeof billing;
