const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const fs = require("fs");

const serviceAccount = JSON.parse(fs.readFileSync("./serviceAccountKey.json", "utf8"));

initializeApp({
  credential: cert(serviceAccount)
});

const uid = "yf6lNCUnyQWasAXu4esqUBKTdvF3";

async function setAdmin() {
  try {
    await getAuth().setCustomUserClaims(uid, { admin: true });
    console.log("Berhasil! Akun sudah menjadi Admin.");
    
    // Verifikasi langsung
    const userRecord = await getAuth().getUser(uid);
    console.log("Email:", userRecord.email);
    console.log("Custom Claims:", userRecord.customClaims);
    process.exit(0);
  } catch (err) {
    console.error("Gagal:", err);
    process.exit(1);
  }
}

setAdmin();