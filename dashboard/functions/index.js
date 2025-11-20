const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.updateStaffAuth = functions.https.onCall(async (data, context) => {
  console.log("🔥 Function called with data:", data);

  const { uid, email, password, adminPassword } = data;
  const CORRECT_ADMIN_PASSWORD = "admin123";

  try {
    // 1️⃣ Check admin password
    console.log("🔑 Checking admin password...");
    if (adminPassword !== CORRECT_ADMIN_PASSWORD) {
      console.error("❌ Admin password incorrect!");
      throw new functions.https.HttpsError(
        "permission-denied",
        "Admin password is incorrect."
      );
    }
    console.log("✅ Admin password correct");

    // 2️⃣ Check UID
    console.log("🆔 Checking UID...");
    if (!uid || uid.trim() === "") {
      console.error("❌ UID missing!");
      throw new functions.https.HttpsError(
        "invalid-argument",
        "UID is required."
      );
    }
    console.log("✅ UID provided:", uid);

    // 3️⃣ Check email/password
    console.log("📧 Checking email/password fields...");
    if (
      (!email || email.trim() === "") &&
      (!password || password.trim() === "")
    ) {
      console.error("❌ Neither email nor password provided!");
      throw new functions.https.HttpsError(
        "invalid-argument",
        "At least one of email or password must be provided."
      );
    }
    console.log("✅ Email or password is provided");

    // 4️⃣ Prepare update object
    const updateData = {};
    if (email && email.trim() !== "") updateData.email = email;
    if (password && password.trim() !== "") updateData.password = password;
    console.log("📝 Prepared update object:", updateData);

    // 5️⃣ Update user
    console.log("🔄 Updating user in Firebase Auth...");
    const user = await admin.auth().updateUser(uid, updateData);
    console.log("✅ User updated successfully:", user.uid);

    return { success: true, user };
  } catch (error) {
    console.error("💥 Error occurred:", error);
    throw new functions.https.HttpsError("internal", error.message);
  } finally {
    console.log("🏁 Function finished execution");
  }
});
