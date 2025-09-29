/*
 Paste your Firebase web config here or set FIREBASE_* env vars in Netlify and the app will read them.
*/
export const firebaseConfig = {
  apiKey: window.__env && window.__env.FIREBASE_API_KEY || "",
  authDomain: window.__env && window.__env.FIREBASE_AUTH_DOMAIN || "",
  projectId: window.__env && window.__env.FIREBASE_PROJECT_ID || "",
  storageBucket: window.__env && window.__env.FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: window.__env && window.__env.FIREBASE_MESSAGING_SENDER_ID || "",
  appId: window.__env && window.__env.FIREBASE_APP_ID || "",
  measurementId: window.__env && window.__env.FIREBASE_MEASUREMENT_ID || ""
};
