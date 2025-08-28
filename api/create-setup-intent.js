// api/create-setup-intent.js
import Stripe from "stripe";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const email = (req.body && req.body.email) || "";
    const customer = await stripe.customers.create({ email });
    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ["card"], // Apple/Google Pay は card にマップ
      usage: "off_session",
    });
    res.status(200).json({
      clientSecret: setupIntent.client_secret,
      customerId: customer.id,
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}
