// api/start-subscription.js
import Stripe from "stripe";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { customerId, paymentMethodId } = req.body || {};
    if (!customerId || !paymentMethodId) {
      return res.status(400).json({ error: "Missing params" });
    }

    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{
        price_data: {
          currency: "usd",
          product_data: { name: "SecureNet Check Monthly" },
          recurring: { interval: "month" },
          unit_amount: 999, // $9.99
        },
      }],
      trial_period_days: 7,
      payment_behavior: "default_incomplete",
      expand: ["latest_invoice.payment_intent"],
    });

    res.status(200).json({
      subscriptionId: subscription.id,
      status: subscription.status,
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}
