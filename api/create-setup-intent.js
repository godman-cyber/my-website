// api/create-setup-intent.js
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// VercelのNode関数は req.body が未パースのことがある→安全に読む
async function readJson(req) {
  if (req.body) return req.body;                  // ある環境では入っている
  const chunks = [];
  for await (const c of req) chunks.push(c);      // ストリームから読む
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const body = await readJson(req);
    const email = body?.email || undefined;

    // 顧客を作成（メールがあれば付与）
    const customer = await stripe.customers.create({ email });

    // 支払い手段（Apple/Google Pay含む"card"）を保存するためのSetupIntent
    const si = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ["card"],
      usage: "off_session",
    });

    res.status(200).json({
      clientSecret: si.client_secret,
      customerId: customer.id,
    });
  } catch (e) {
    // フロントは data.error を見る実装なので 200で返す
    res.status(200).json({ error: e.message || "server error" });
  }
}
