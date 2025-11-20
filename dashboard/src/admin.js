const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json"); // Download from Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://smartgymtracker-4123b-default-rtdb.firebaseio.com",
});

module.exports = admin;
