import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-05-27.dahlia",
});

export const STRIPE_PRICE_IDS: Record<string, string> = {
  sales: process.env.STRIPE_PRICE_SALES || "",
  finance: process.env.STRIPE_PRICE_FINANCE || "",
  inventory: process.env.STRIPE_PRICE_INVENTORY || "",
  communication: process.env.STRIPE_PRICE_COMMUNICATION || "",
  pro: process.env.STRIPE_PRICE_PRO || "",
};
