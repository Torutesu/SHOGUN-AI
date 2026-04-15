/**
 * Vercel Edge Function: Stripe Webhook Receiver
 *
 * Receives Stripe events and updates subscription status in Supabase.
 * This runs on Vercel, NOT in the Tauri app.
 *
 * Deploy: vercel deploy
 * Webhook URL: https://your-domain.vercel.app/api/stripe/webhook
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role for server-side writes
);

export const config = { api: { bodyParser: false } };

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = await readRawBody(req);
  const sig = req.headers["stripe-signature"];

  // In production, verify the signature with Stripe
  // const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);

  const event = JSON.parse(body);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.clerk_user_id;
        if (!userId) break;

        await supabase.from("subscriptions").upsert({
          user_id: userId,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          plan: session.metadata?.plan ?? "standard",
          active: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;
        const { data: existing } = await supabase
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_subscription_id", sub.id)
          .single();

        if (existing) {
          await supabase.from("subscriptions").update({
            active: sub.status === "active" || sub.status === "trialing",
            plan: sub.metadata?.plan ?? "standard",
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          }).eq("user_id", existing.user_id);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        await supabase.from("subscriptions").update({
          active: false,
          plan: "free",
          updated_at: new Date().toISOString(),
        }).eq("stripe_subscription_id", sub.id);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        await supabase.from("subscriptions").update({
          active: false,
          updated_at: new Date().toISOString(),
        }).eq("stripe_customer_id", invoice.customer);
        break;
      }
    }

    return res.status(200).json({ received: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
}

function readRawBody(req: any): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk: any) => { data += chunk; });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}
