import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const email = (req.body && req.body.email) || undefined;

    const customer = await stripe.customers.create({ email });

    const si = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ["card"], // Apple/Google Pay も "card" として来る
      usage: "off_session",
    });

    res.status(200).json({
      clientSecret: si.client_secret,
      customerId: customer.id,
    });
  } catch (e) {
    res.status(200).json({ error: e.message });
  }
}
