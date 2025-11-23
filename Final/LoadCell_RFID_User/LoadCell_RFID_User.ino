// -----------------------------------------------------
// LoadCell + RFID + Timestamp + Firebase (FULL MERGED)
// -----------------------------------------------------

#include <ESP8266WiFi.h>
#include <FirebaseESP8266.h>
#include <SPI.h>
#include "HX711.h"
#include <MFRC522.h>
#include <time.h>

// ------------------ WiFi ------------------
#define WIFI_SSID "Murdock A05s"
#define WIFI_PASSWORD "20060905"

// ------------------ Firebase ------------------
#define FIREBASE_HOST "smartgymtracker-4123b-default-rtdb.firebaseio.com"
#define FIREBASE_AUTH "RCq1FclKIALVguVHCAnNLwmCAvPH9i28PMiGgS1Z"

// ------------------ Load Cell ------------------
#define DT_PIN  D3
#define SCK_PIN D4
HX711 scale;

float calibration_factor = 732.0;

// ------------------ RFID ------------------
#define RST_PIN D2
#define SS_PIN  D1
MFRC522 mfrc522(SS_PIN, RST_PIN);

// ------------------ Firebase Objects ------------------
FirebaseData firebaseData;
FirebaseAuth auth;
FirebaseConfig config;

// ------------------ NTP ------------------
const long gmtOffset_sec     = 5 * 3600 + 1800;
const int daylightOffset_sec = 0;
const char* ntpServer        = "pool.ntp.org";

// ------------------ Equipment Node ------------------
const String EQUIPMENT_NODE_ID  = "load_cell_1";
const String FIREBASE_BASE_PATH = "/equipment/" + EQUIPMENT_NODE_ID;

// -----------------------------------------------------
// Timestamp
// -----------------------------------------------------
String getTimestamp() {
  time_t now;
  struct tm timeinfo;
  time(&now);
  localtime_r(&now, &timeinfo);

  char buffer[30];
  sprintf(buffer,
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
// WiFi Connect
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

// -----------------------------------------------------
// Load Cell Functions
// -----------------------------------------------------
float getWeight() {
  if (scale.is_ready()) {
    return scale.get_units(5);
  }
  return 0.0;
}

void updateFirebase(float weight, String status) {
  String basePath = FIREBASE_BASE_PATH;

  Firebase.setFloat(firebaseData, basePath + "/weight", weight);
  Firebase.setString(firebaseData, basePath + "/status", status);
  Firebase.setString(firebaseData, basePath + "/equipment_id", EQUIPMENT_NODE_ID);
  Firebase.setString(firebaseData, basePath + "/timestamp", getTimestamp());

  Serial.println("Firebase Updated:");
  Serial.println("Weight: " + String(weight));
}

// -----------------------------------------------------
// RFID Helper Functions
// -----------------------------------------------------
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

// -----------------------------------------------------
// RFID Logic (FULL VERSION WITH LOGGING)
// -----------------------------------------------------
void handleRFID() {
  if (!mfrc522.PICC_IsNewCardPresent()) return;
  if (!mfrc522.PICC_ReadCardSerial()) return;

  String cardID    = buildCardID();
  String timestamp = getTimestamp();

  Serial.println("\n🔍 RFID Scan -------------------------");
  Serial.println("Card: " + cardID);
  Serial.println("Time: " + timestamp);

  Firebase.setString(firebaseData, "/last_scanned_card", cardID);

  String uidPath   = "/users/" + cardID + "/uid";
  String linkedUID = fbGetString(uidPath);
  String userRoot  = "/users/" + cardID;

  // Unassigned card
  if (linkedUID == "") {
    Serial.println("❌ Unassigned Card");

    Firebase.setInt(firebaseData, userRoot + "/inside", 0);

    FirebaseJson logEntry;
    logEntry.set("rfid", cardID);
    logEntry.set("customerUID", "");
    logEntry.set("customerName", "Unknown");
    logEntry.set("action", "denied");
    logEntry.set("timestamp", timestamp);

    Firebase.pushJSON(firebaseData, "/users_in_out_log", logEntry);
    return;
  }

  // Assigned User
  int inside    = fbGetInt(userRoot + "/inside", 0);
  int newInside = inside ? 0 : 1;

  Firebase.setInt(firebaseData, userRoot + "/inside", newInside);

  String customerName = fbGetString("/customers/" + linkedUID + "/name");
  String action = newInside ? "in" : "out";

  FirebaseJson logEntry;
  logEntry.set("rfid", cardID);
  logEntry.set("customerUID", linkedUID);
  logEntry.set("customerName", customerName);
  logEntry.set("action", action);
  logEntry.set("timestamp", timestamp);

  Firebase.pushJSON(firebaseData, "/users_in_out_log", logEntry);

  Serial.println(action == "in" ? "ENTER 🔼" : "EXIT 🔽");
}

// -----------------------------------------------------
// SETUP
// -----------------------------------------------------
void setup() {
  Serial.begin(115200);

  scale.begin(DT_PIN, SCK_PIN);

  SPI.begin();
  mfrc522.PCD_Init();

  connectWiFi();

  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);

  config.database_url = FIREBASE_HOST;
  config.signer.tokens.legacy_token = FIREBASE_AUTH;
  Firebase.begin(&config, &auth);

  scale.set_scale(calibration_factor);
  scale.tare();

  Serial.println("Load Cell + RFID Ready 🎯");
}

// -----------------------------------------------------
// LOOP
// -----------------------------------------------------
void loop() {
  float weight = getWeight();
  String status = (weight >= 500) ? "AVAILABLE" : "UNAVAILABLE";

  updateFirebase(weight, status);

  handleRFID();   // FAST RFID READING
  delay(150);     // Much faster — improves detection!
}
