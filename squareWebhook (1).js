const crypto = require("crypto");
const admin = require("firebase-admin");

function verifySignature(signatureKey, notificationUrl, body, headerSignature) {
  const hmac = crypto.createHmac('sha256', signatureKey);
  hmac.update(notificationUrl + body);
  const computed = hmac.digest('base64');
  try { return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(headerSignature)); }
  catch(e){ return false; }
}

let adminInit=false;
function initFirebase(){
  if(adminInit) return;
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || "";
  if(!b64) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_BASE64 env var");
  const svc = JSON.parse(Buffer.from(b64,"base64").toString("utf8"));
  admin.initializeApp({ credential: admin.credential.cert(svc) });
  adminInit=true;
}

exports.handler = async function(event){
  try{
    const body = event.body || "";
    const sig = event.headers['x-square-hmacsha256-signature'] || event.headers['X-Square-HmacSha256-Signature'] || "";
    const sigKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || "";
    const notificationUrl = (process.env.SITE_URL || '') + '/.netlify/functions/squareWebhook';
    if(!verifySignature(sigKey, notificationUrl, body, sig)){ console.warn('Invalid webhook signature'); return { statusCode:401, body:'Invalid signature' }; }
    const payload = JSON.parse(body);
    console.log('webhook payload slice:', JSON.stringify(payload).slice(0,1200));
    initFirebase();
    const db = admin.firestore();
    const obj = (payload.data && payload.data.object) || {};
    const payment = obj.payment || obj;
    if(!payment){ console.log('no payment'); return { statusCode:200, body:'no payment' }; }
    const status = (payment.status||'').toUpperCase();
    if(status !== 'COMPLETED' && status !== 'CAPTURED'){ console.log('not completed', status); return { statusCode:200, body:'ignored' }; }
    const referenceId = payment.reference_id || payment.order_id || payment.id;
    if(!referenceId){ console.warn('no reference id'); return { statusCode:200, body:'no ref' }; }
    // try update by doc id
    const provRef = db.collection('providers').doc(referenceId);
    const provSnap = await provRef.get();
    if(provSnap.exists){
      await provRef.update({ paid:true, paidAt: admin.firestore.FieldValue.serverTimestamp(), paymentInfo: payment });
      console.log('Updated provider by id', referenceId);
      return { statusCode:200, body:'ok' };
    }
    const clientRef = db.collection('clients').doc(referenceId);
    const clientSnap = await clientRef.get();
    if(clientSnap.exists){
      await clientRef.update({ paid:true, paidAt: admin.firestore.FieldValue.serverTimestamp(), paymentInfo: payment });
      console.log('Updated client by id', referenceId);
      return { statusCode:200, body:'ok' };
    }
    // fallback search fields
    const provQ = await db.collection('providers').where('providerId','==',referenceId).limit(1).get();
    if(!provQ.empty){ await provQ.docs[0].ref.update({ paid:true, paidAt: admin.firestore.FieldValue.serverTimestamp(), paymentInfo: payment }); return { statusCode:200, body:'ok' }; }
    const cliQ = await db.collection('clients').where('clientId','==',referenceId).limit(1).get();
    if(!cliQ.empty){ await cliQ.docs[0].ref.update({ paid:true, paidAt: admin.firestore.FieldValue.serverTimestamp(), paymentInfo: payment }); return { statusCode:200, body:'ok' }; }
    console.warn('No matching record for ref', referenceId);
    return { statusCode:200, body:'no match' };
  }catch(err){ console.error(err); return { statusCode:500, body:'error' }; }
};
