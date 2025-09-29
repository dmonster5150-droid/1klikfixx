const { Client, Environment } = require("square");
const admin = require("firebase-admin");

async function initAdmin(){
  if (admin.apps && admin.apps.length) return admin;
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || "";
  if (!b64) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_BASE64 env var");
  const svc = JSON.parse(Buffer.from(b64,"base64").toString("utf8"));
  admin.initializeApp({ credential: admin.credential.cert(svc) });
  return admin;
}

exports.handler = async function(event) {
  try {
    if(event.httpMethod !== "POST") return { statusCode:405, body: "Method not allowed" };
    const body = JSON.parse(event.body || "{}");
    const providerId = body.providerId || null;
    if(!providerId) return { statusCode:400, body: "providerId required" };

    const adminSDK = await initAdmin();
    const db = adminSDK.firestore();
    let subscriptionPrice = Number(process.env.SUBSCRIPTION_PRICE_CENTS || 2099);
    let bookingPrice = Number(process.env.BOOKING_PRICE_CENTS || 1000);
    let currency = process.env.CURRENCY || "USD";
    try {
      const doc = await db.collection("settings").doc("general").get();
      if(doc.exists){
        const s = doc.data();
        subscriptionPrice = s.subscriptionPriceCents || subscriptionPrice;
        bookingPrice = s.bookingPriceCents || bookingPrice;
        currency = s.currency || currency;
      }
    } catch(e){ console.warn("Failed to read settings from Firestore, using env vars", e); }

    const isSubscription = body.type === "subscription";
    const amountCents = isSubscription ? subscriptionPrice : bookingPrice;
    const itemName = isSubscription ? "1ClikFix Provider Subscription" : "1ClikFix Booking Fee";

    const accessToken = process.env.SQUARE_ACCESS_TOKEN;
    const env = (process.env.SQUARE_ENV === "production") ? Environment.Production : Environment.Sandbox;
    const client = new Client({ environment: env, accessToken });

    const idempotencyKey = 'link_' + Date.now() + '_' + Math.random().toString(36).slice(2,8);

    const createPaymentLinkBody = {
      idempotency_key: idempotencyKey,
      order: {
        location_id: process.env.SQUARE_LOCATION_ID,
        line_items: [
          {
            name: itemName,
            quantity: "1",
            base_price_money: {
              amount: amountCents,
              currency: currency
            }
          }
        ]
      },
      checkout_options: {
        redirect_url: body.redirectUrl || (process.env.SITE_URL + "/src/pages/receipt.html")
      },
      reference_id: providerId
    };

    const res = await client.checkoutApi.createPaymentLink(createPaymentLinkBody);
    const url = res.result && res.result.payment_link && res.result.payment_link.url;
    return { statusCode:200, body: JSON.stringify({ url }) };
  } catch(err) {
    console.error(err);
    return { statusCode:500, body: JSON.stringify({ error: err.message || err }) };
  }
};
