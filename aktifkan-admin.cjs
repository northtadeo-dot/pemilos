const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const fs = require("fs");

const serviceAccount = JSON.parse(fs.readFileSync("./serviceAccountKey.json", "utf8"));
initializeApp({ credential: cert(serviceAccount) });

const uid = "yf6lNCUnyQWasAXu4esqUBKTdvF3";

(async () => {
  await getAuth().setCustomUserClaims(uid, { admin: true });
  const user = await getAuth().getUser(uid);
  console.log("Email:", user.email);
  console.log("Custom Claims Baru:", user.customClaims);
  process.exit(0);
})();
