1ClixFix - Sandbox-ready release (Firebase + Square + Netlify)

Contents:
- public/ (logo placeholders + favicon)
- src/firebaseConfig.js (paste your firebase web config or set envs)
- src/pages/Home.html
- src/pages/ClientRegister.html (Book Now -> saves client -> creates payment link)
- src/pages/ProviderSubscribe.html (Subscribe -> saves provider -> creates payment link)
- src/pages/receipt.html (simple thank you page)
- functions/createPaymentLink.js (reads settings from Firestore or env vars, creates Square payment link)
- functions/squareWebhook.js (verifies signature, updates Firestore paid:true)
- emails/confirmation.html (simple email template)
- .env.example (list of env vars you must set in Netlify)
- netlify.toml, package.json, README.txt

Quick deploy steps (phone-friendly):
1. Create a GitHub repo (you already have 1clixfix). Upload the contents of this ZIP (do not upload the outer folder).
2. Connect the repo to Netlify (Import from Git via GitHub). Branch: main. Build command: leave blank. Publish dir: /
3. In Netlify site settings -> Environment variables, add the keys from .env.example.
   - IMPORTANT: create a Firebase service account JSON (Firebase Console -> Project Settings -> Service Accounts -> Generate new private key).
   - Base64-encode that JSON (use https://www.base64encode.org/ ), then paste the long string into the Netlify env var FIREBASE_SERVICE_ACCOUNT_BASE64.
4. In Firebase console, create a Firestore collection 'settings' and a document 'general' with fields:
   - subscriptionPriceCents: 2099
   - bookingPriceCents: 1000
   - currency: "USD"
   - subscribeButtonText: "Subscribe Now"
   - bookButtonText: "Book Now"
5. In Square Developer Dashboard, create a Sandbox webhook for events payment.* pointing to:
   https://<your-site>.netlify.app/.netlify/functions/squareWebhook
   Copy the webhook signature key and paste it into Netlify env var SQUARE_WEBHOOK_SIGNATURE_KEY.
6. Deploy and test with Square sandbox card 4111 1111 1111 1111 (expiry future, CVV any, zip any).
7. Check Netlify Functions logs and Firebase 'providers'/'clients' to verify paid:true after webhook.

If you'd like, reply and I will walk you step-by-step through adding env vars to Netlify and configuring Square webhook.
