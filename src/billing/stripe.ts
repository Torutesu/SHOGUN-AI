import { logger } from "../logger.js";

/**
 * Stripe billing integration for SHOGUN subscription management.
 *
 * Plans:
 *   - SHOGUN Pro: $49/month (個人向け)
 *   - SHOGUN Team: $62/month per seat (チーム向け、将来)
 *
 * Flow:
 *   1. User clicks "Subscribe" in Tauri app
 *   2. App opens Stripe Checkout URL in system browser
 *   3. After payment, webhook confirms subscription
 *   4. App validates subscription via Stripe API
 *   5. Features unlock locally
 *
 * All subscription state is verified server-side via Stripe API.
 * No client-side license hacks possible.
 */

export interface SubscriptionStatus {
  active: boolean;
  plan: "free" | "pro" | "team";
  customerId: string | null;
  subscriptionId: string | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

export interface StripeBillingOptions {
  /** Stripe secret key (server-side only) */
  secretKey: string;
  /** Stripe price ID for Pro plan */
  proPriceId: string;
  /** Stripe price ID for Team plan */
  teamPriceId?: string;
  /** Success redirect URL */
  successUrl?: string;
  /** Cancel redirect URL */
  cancelUrl?: string;
}

const STRIPE_API = "https://api.stripe.com/v1";

export class StripeBilling {
  private secretKey: string;
  private proPriceId: string;
  private teamPriceId: string;
  private successUrl: string;
  private cancelUrl: string;

  constructor(options: StripeBillingOptions) {
    this.secretKey = options.secretKey;
    this.proPriceId = options.proPriceId;
    this.teamPriceId = options.teamPriceId ?? "";
    this.successUrl = options.successUrl ?? "https://syogun.com/billing/success";
    this.cancelUrl = options.cancelUrl ?? "https://syogun.com/billing/cancel";
  }

  /**
   * Create a Stripe Checkout session for new subscription.
   * Returns the URL to redirect the user to.
   */
  async createCheckoutSession(options: {
    email: string;
    plan: "pro" | "team";
    seats?: number;
  }): Promise<string> {
    const priceId = options.plan === "team" ? this.teamPriceId : this.proPriceId;
    const quantity = options.plan === "team" ? (options.seats ?? 1) : 1;

    const body = new URLSearchParams({
      "mode": "subscription",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": String(quantity),
      "customer_email": options.email,
      "success_url": this.successUrl,
      "cancel_url": this.cancelUrl,
      "subscription_data[metadata][product]": "shogun",
      "subscription_data[metadata][plan]": options.plan,
    });

    const response = await this.stripeRequest("POST", "/checkout/sessions", body);
    return response.url;
  }

  /**
   * Check subscription status for a customer.
   */
  async getSubscriptionStatus(customerId: string): Promise<SubscriptionStatus> {
    try {
      const response = await this.stripeRequest(
        "GET",
        `/customers/${customerId}/subscriptions?limit=1`
      );

      if (!response.data || response.data.length === 0) {
        return {
          active: false,
          plan: "free",
          customerId,
          subscriptionId: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
        };
      }

      const sub = response.data[0];
      const plan = sub.metadata?.plan === "team" ? "team" : "pro";

      return {
        active: sub.status === "active" || sub.status === "trialing",
        plan: sub.status === "active" ? plan : "free",
        customerId,
        subscriptionId: sub.id,
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      };
    } catch (err) {
      logger.error(`Stripe status check failed: ${err}`);
      return {
        active: false,
        plan: "free",
        customerId,
        subscriptionId: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      };
    }
  }

  /**
   * Create a billing portal session (for managing subscription).
   */
  async createPortalSession(customerId: string): Promise<string> {
    const body = new URLSearchParams({
      customer: customerId,
      return_url: this.successUrl,
    });

    const response = await this.stripeRequest("POST", "/billing_portal/sessions", body);
    return response.url;
  }

  /**
   * Validate a subscription is active (for feature gating).
   */
  async isSubscriptionActive(customerId: string): Promise<boolean> {
    const status = await this.getSubscriptionStatus(customerId);
    return status.active;
  }

  /**
   * Handle Stripe webhook event.
   */
  async handleWebhook(event: {
    type: string;
    data: { object: Record<string, unknown> };
  }): Promise<void> {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        logger.info("Subscription created", {
          customerId: session.customer,
          subscriptionId: session.subscription,
        });
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        logger.info("Subscription cancelled", {
          subscriptionId: sub.id,
        });
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        logger.warn("Payment failed", {
          customerId: invoice.customer,
        });
        break;
      }
    }
  }

  private async stripeRequest(
    method: string,
    path: string,
    body?: URLSearchParams
  ): Promise<any> {
    const response = await fetch(`${STRIPE_API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body?.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Stripe API error (${response.status}): ${error}`);
    }

    return response.json();
  }
}
