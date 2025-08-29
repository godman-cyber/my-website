// api/start-subscription.js
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Vercelでは req.body が未パースの場合があるので安全に読む
async function readJson(req) {
  if (req.body) return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const body = await readJson(req);
    const { customerId, paymentMethodId } = body || {};

    if (!customerId || !paymentMethodId) {
      return res.status(200).json({ error: "customerId / paymentMethodId is required" });
    }
    if (!process.env.PRICE_ID) {
      return res.status(200).json({ error: "PRICE_ID env is not set" });
    }

    // PMを顧客に紐付け（既に紐付いてる場合のエラーは無視）
    try {
      await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    } catch (err) {
      if (err.code !== "resource_already_exists") throw err;
    }

    // デフォルトPMに設定
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    // 7日トライアル付きのサブスク作成
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: process.env.PRICE_ID }],
      trial_period_days: 7,
      // trialがあるので payment_behavior は省略でOK（付けても動く）
      collection_method: "charge_automatically",
      expand: ["latest_invoice.payment_intent"],
    });

    res.status(200).json({
      ok: true,
      subscriptionId: subscription.id,
      status: subscription.status, // trialing想定
    });
  } catch (e) {
    res.status(200).json({ error: e.message || "server error" });
  }
}
