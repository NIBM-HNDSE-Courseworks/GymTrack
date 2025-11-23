// -----------------------------------------------------
// RFID_UserTracking.ino   (REAL TIMESTAMP VERSION)
// -----------------------------------------------------

#include <ESP8266WiFi.h>
#include <FirebaseESP8266.h>
#include <SPI.h>
#include <MFRC522.h>
#include <time.h>

// --- WiFi ---
#define WIFI_SSID "Hirantha's Galaxy M31"
#define WIFI_PASSWORD "Hira@2413"

// --- Firebase ---
#define FIREBASE_HOST "smartgymtracker-4123b-default-rtdb.firebaseio.com"
#define FIREBASE_AUTH "RCq1FclKIALVguVHCAnNLwmCAvPH9i28PMiGgS1Z"

// --- RFID ---
#define RST_PIN D2
#define SS_PIN D1
MFRC522 mfrc522(SS_PIN, RST_PIN);

// Firebase
FirebaseData firebaseData;
FirebaseAuth auth;
FirebaseConfig config;

// -----------------------------------------------------
// NTP TIME SETTINGS (GMT+5:30 for Sri Lanka)
// -----------------------------------------------------
const long gmtOffset_sec = 5 * 3600 + 1800; // 5.5h → 19800 seconds
const int daylightOffset_sec = 0;           // No DST in Sri Lanka
const char* ntpServer = "pool.ntp.org";

// -----------------------------------------------------
// GET REAL TIME AS STRING
// -----------------------------------------------------
String getTimestamp() {
  time_t now;
  struct tm timeinfo;

  time(&now);
  localtime_r(&now, &timeinfo);

  char buffer[30];
  snprintf(buffer, sizeof(buffer),
           "%04d-%02d-%02dT%02d:%02d:%02d",
           timeinfo.tm_year + 1900,
           timeinfo.tm_mon + 1,
           timeinfo.tm_mday,
           timeinfo.tm_hour,
           timeinfo.tm_min,
           timeinfo.tm_sec);

  return String(buffer);
}

// -----------------------------------------------------

void connectWiFi() {
  Serial.print("Connecting WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(300);
  }
  Serial.println("\nWiFi Connected ✅");
}

// Build RFID Card ID String
String buildCardID() {
  String cardID = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) cardID += "0";
    cardID += String(mfrc522.uid.uidByte[i], HEX);
  }
  cardID.toUpperCase();
  return cardID;
}

// Firebase Helpers
String fbGetString(String path) {
  if (Firebase.getString(firebaseData, path)) return firebaseData.stringData();
  return "";
}

int fbGetInt(String path, int fallback = 0) {
  if (Firebase.getInt(firebaseData, path)) return firebaseData.intData();
  return fallback;
}

// -----------------------------------------------------

void setup() {
  Serial.begin(115200);
  SPI.begin();
  mfrc522.PCD_Init();

  Serial.println("Starting RFID Reader...");
  connectWiFi();

  // --- NTP TIME CONFIG ---
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);

  Serial.println("Getting time...");
  delay(2000);

  time_t now = time(nullptr);
  while (now < 100000) {  // Wait until NTP syncs
    Serial.print(".");
    delay(500);
    now = time(nullptr);
  }
  Serial.println("\nTime Synced ⏱");

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
  String timestamp = getTimestamp();

  Serial.println("\n🔍 RFID Scan -------------------------");
  Serial.println("Card: " + cardID);
  Serial.println("Time: " + timestamp);

  Firebase.setString(firebaseData, "/last_scanned_card", cardID);

  String uidPath = "/users/" + cardID + "/uid";
  String linkedUID = fbGetString(uidPath);
  String userRoot = "/users/" + cardID;

  // -----------------------------------------------------
  // UNASSIGNED CARD
  // -----------------------------------------------------
  if (linkedUID == "") {
    Serial.println("Status: ❌ UNASSIGNED → No Entry Allowed");

    Firebase.setInt(firebaseData, userRoot + "/inside", 0);
    Serial.println("Action: inside = 0 (DENIED)");

    FirebaseJson logEntry;
    logEntry.set("rfid", cardID);
    logEntry.set("customerUID", "");
    logEntry.set("customerName", "Unknown");
    logEntry.set("action", "denied");
    logEntry.set("timestamp", timestamp);

    Firebase.pushJSON(firebaseData, "/users_in_out_log", logEntry);
    return;
  }

  // -----------------------------------------------------
  // ASSIGNED USER
  // -----------------------------------------------------
  Serial.println("Status: ✅ ASSIGNED USER");

  int inside = fbGetInt(userRoot + "/inside", 0);
  int newInside = inside == 1 ? 0 : 1;

  Firebase.setInt(firebaseData, userRoot + "/inside", newInside);

  String action = newInside == 1 ? "in" : "out";

  Serial.print("Action: ");
  Serial.println(action == "in" ? "ENTER 🔼" : "EXIT 🔽");

  String customerName = fbGetString("/customers/" + linkedUID + "/name");

  FirebaseJson logEntry;
  logEntry.set("rfid", cardID);
  logEntry.set("customerUID", linkedUID);
  logEntry.set("customerName", customerName);
  logEntry.set("action", action);
  logEntry.set("timestamp", timestamp);

  Firebase.pushJSON(firebaseData, "/users_in_out_log", logEntry);
}
