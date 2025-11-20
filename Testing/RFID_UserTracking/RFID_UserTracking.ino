// -----------------------------------------------------
// RFID_UserTracking.ino   (CLEAN + CORRECT LOGIC)
// -----------------------------------------------------

#include <ESP8266WiFi.h>
#include <FirebaseESP8266.h>
#include <SPI.h>
#include <MFRC522.h>

// --- WiFi ---
#define WIFI_SSID "Dialog 4G 375"
#define WIFI_PASSWORD "e7AE2007"

// --- Firebase ---
#define FIREBASE_HOST "smartgymtracker-4123b-default-rtdb.firebaseio.com"
#define FIREBASE_AUTH "RCq1FclKIALVguVHCAnNLwmCAvPH9i28PMiGgS1Z"

// --- RFID ---
#define RST_PIN D2
#define SS_PIN D1
MFRC522 mfrc522(SS_PIN, RST_PIN);

// --- Firebase ---
FirebaseData firebaseData;
FirebaseAuth auth;
FirebaseConfig config;

void connectWiFi() {
  Serial.print("Connecting WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(300);
  }
  Serial.println("\nWiFi Connected ✅");
}

String buildCardID() {
  String cardID = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) cardID += "0";
    cardID += String(mfrc522.uid.uidByte[i], HEX);
  }
  cardID.toUpperCase();
  return cardID;
}

String fbGetString(String path) {
  if (Firebase.getString(firebaseData, path)) return firebaseData.stringData();
  return "";
}

int fbGetInt(String path, int fallback = 0) {
  if (Firebase.getInt(firebaseData, path)) return firebaseData.intData();
  return fallback;
}

void setup() {
  Serial.begin(115200);
  SPI.begin();
  mfrc522.PCD_Init();

  Serial.println("Starting RFID Reader...");
  connectWiFi();

  config.database_url = FIREBASE_HOST;
  config.signer.tokens.legacy_token = FIREBASE_AUTH;
  Firebase.begin(&config, &auth);

  Serial.println("Ready to scan 🎯");
}

void loop() {
  if (!mfrc522.PICC_IsNewCardPresent() || !mfrc522.PICC_ReadCardSerial()) {
    delay(100);
    return;
  }

  String cardID = buildCardID();
  Serial.println("\n🔍 RFID Scan -------------------------");
  Serial.println("Card: " + cardID);

  // Update frontend
  Firebase.setString(firebaseData, "/last_scanned_card", cardID);

  String uidPath = "/users/" + cardID + "/uid";
  String linkedUID = fbGetString(uidPath);
  String userRoot = "/users/" + cardID;

  // -----------------------------------------------------
  // UNASSIGNED CARD → only save inside = 0 (no toggle)
  // -----------------------------------------------------
  if (linkedUID == "") {
    Serial.println("Status: ❌ UNASSIGNED → No Entry Allowed");

    Firebase.setInt(firebaseData, userRoot + "/inside", 0);

    Serial.println("Action: inside = 0 (DENIED)");
    return;
  }

  // -----------------------------------------------------
  // ASSIGNED CARD → toggle entry/exit
  // -----------------------------------------------------
  Serial.println("Status: ✅ ASSIGNED USER");

  int inside = fbGetInt(userRoot + "/inside", 0);
  int newInside = inside == 1 ? 0 : 1;

  Firebase.setInt(firebaseData, userRoot + "/inside", newInside);

  Serial.print("Action: ");
  Serial.println(newInside == 1 ? "ENTER 🔼" : "EXIT 🔽");
}
