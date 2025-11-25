// -----------------------------------------------------
// LoadCell + RFID + Timestamp + Firebase (FULL MERGED)
// -----------------------------------------------------

#include <ESP8266WiFi.h>           // WiFi functions for ESP8266
#include <FirebaseESP8266.h>       // Firebase library for ESP8266
#include <SPI.h>                   // SPI for RFID module
#include "HX711.h"                 // Load cell amplifier library
#include <MFRC522.h>               // RFID module library
#include <time.h>                  // Time functions (NTP)

// ------------------ WiFi ------------------
#define WIFI_SSID "HUAWEI MATE 40 PRO"   // Your WiFi SSID
#define WIFI_PASSWORD "qwertyuiop"       // Your WiFi password

// ------------------ Firebase ------------------
#define FIREBASE_HOST "smartgymtracker-4123b-default-rtdb.firebaseio.com" // Firebase RTDB URL
#define FIREBASE_AUTH "RCq1FclKIALVguVHCAnNLwmCAvPH9i28PMiGgS1Z"          // Firebase authentication key

// ------------------ Load Cell ------------------
#define DT_PIN  D3     // HX711 DT pin
#define SCK_PIN D4     // HX711 SCK pin
HX711 scale;           // Load cell object

float calibration_factor = 732.0; // Calibration value for load cell

// ------------------ RFID ------------------
#define RST_PIN D2     // RFID reset pin
#define SS_PIN  D1     // RFID SDA/SS pin
MFRC522 mfrc522(SS_PIN, RST_PIN); // RFID module object

// ------------------ Firebase Objects ------------------
FirebaseData firebaseData;   // Firebase communication object
FirebaseAuth auth;           // Firebase authentication handler
FirebaseConfig config;       // Firebase configuration handler

// ------------------ NTP ------------------
// Sri Lanka offset: GMT +5:30 → 5 hours * 3600 + 1800 seconds
const long gmtOffset_sec     = 5 * 3600 + 1800;
const int daylightOffset_sec = 0;                // No daylight saving
const char* ntpServer        = "pool.ntp.org";   // NTP server address

// ------------------ Equipment Node ------------------
// Will push data to: /equipment/load_cell_1
const String EQUIPMENT_NODE_ID  = "load_cell_1";
const String FIREBASE_BASE_PATH = "/equipment/" + EQUIPMENT_NODE_ID;

// -----------------------------------------------------
// Timestamp
// -----------------------------------------------------
// Generates timestamp in ISO format: YYYY-MM-DDTHH:MM:SS
String getTimestamp() {
  time_t now;
  struct tm timeinfo;
  time(&now);                          // Get current time
  localtime_r(&now, &timeinfo);        // Convert to local time

  char buffer[30];
  sprintf(buffer,                     // Format timestamp string
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
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);    // Start WiFi connection

  while (WiFi.status() != WL_CONNECTED) {  // Wait until connected
    Serial.print(".");
    delay(300);
  }
  Serial.println("\nWiFi Connected ✅");
}

// -----------------------------------------------------
// Load Cell Functions
// -----------------------------------------------------
// Reads weight from HX711
float getWeight() {
  if (scale.is_ready()) {          // Check HX711 is working
    return scale.get_units(5);     // Take average of 5 samples
  }
  return 0.0;                      // Return 0 if not ready
}

// Uploads weight + status to Firebase
void updateFirebase(float weight, String status) {
  String basePath = FIREBASE_BASE_PATH;

  Firebase.setFloat(firebaseData, basePath + "/weight", weight);           // Store weight
  Firebase.setString(firebaseData, basePath + "/status", status);          // Store status
  Firebase.setString(firebaseData, basePath + "/equipment_id", EQUIPMENT_NODE_ID);  // ID
  Firebase.setString(firebaseData, basePath + "/timestamp", getTimestamp());        // Timestamp

  Serial.println("Firebase Updated:");
  Serial.println("Weight: " + String(weight));
}

// -----------------------------------------------------
// RFID Helper Functions
// -----------------------------------------------------
// Convert card UID to hex string
String buildCardID() {
  String cardID = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {   // Loop UID bytes
    if (mfrc522.uid.uidByte[i] < 0x10) cardID += "0"; // Leading zero
    cardID += String(mfrc522.uid.uidByte[i], HEX);    // Add hex value
  }
  cardID.toUpperCase();              // Make it uppercase
  return cardID;
}

// Firebase helper to read string
String fbGetString(String path) {
  if (Firebase.getString(firebaseData, path))
    return firebaseData.stringData(); // Return data
  return "";                           // Otherwise empty
}

// Firebase helper to read int (with fallback)
int fbGetInt(String path, int fallback = 0) {
  if (Firebase.getInt(firebaseData, path))
    return firebaseData.intData();
  return fallback;
}

// -----------------------------------------------------
// RFID Logic (FULL VERSION WITH LOGGING)
// -----------------------------------------------------
void handleRFID() {
  if (!mfrc522.PICC_IsNewCardPresent()) return;    // No new card detected
  if (!mfrc522.PICC_ReadCardSerial()) return;      // Failed reading card

  // Convert UID to string + timestamp
  String cardID    = buildCardID();
  String timestamp = getTimestamp();

  Serial.println("\n🔍 RFID Scan -------------------------");
  Serial.println("Card: " + cardID);
  Serial.println("Time: " + timestamp);

  Firebase.setString(firebaseData, "/last_scanned_card", cardID); // Store last scanned card

  String uidPath   = "/users/" + cardID + "/uid";        // Path of assigned user ID
  String linkedUID = fbGetString(uidPath);               // Read assigned UID
  String userRoot  = "/users/" + cardID;                 // Root path for this user/card

  // -----------------------------
  // Unassigned card logic
  // -----------------------------
  if (linkedUID == "") {
    Serial.println("❌ Unassigned Card");

    Firebase.setInt(firebaseData, userRoot + "/inside", 0); // Mark as not inside

    FirebaseJson logEntry;               // Build log object
    logEntry.set("rfid", cardID);
    logEntry.set("customerUID", "");
    logEntry.set("customerName", "Unknown");
    logEntry.set("action", "denied");
    logEntry.set("timestamp", timestamp);

    Firebase.pushJSON(firebaseData, "/users_in_out_log", logEntry); // Log entry
    return;
  }

  // -----------------------------
  // Assigned User Logic
  // -----------------------------
  int inside    = fbGetInt(userRoot + "/inside", 0);     // Check if user is inside
  int newInside = inside ? 0 : 1;                        // Toggle in/out state

  Firebase.setInt(firebaseData, userRoot + "/inside", newInside); // Update state

  String customerName = fbGetString("/customers/" + linkedUID + "/name"); // Get user name
  String action = newInside ? "in" : "out";                               // Action type

  FirebaseJson logEntry;          // Create log entry
  logEntry.set("rfid", cardID);
  logEntry.set("customerUID", linkedUID);
  logEntry.set("customerName", customerName);
  logEntry.set("action", action);
  logEntry.set("timestamp", timestamp);

  Firebase.pushJSON(firebaseData, "/users_in_out_log", logEntry); // Save log entry

  Serial.println(action == "in" ? "ENTER 🔼" : "EXIT 🔽");
}

// -----------------------------------------------------
// SETUP
// -----------------------------------------------------
void setup() {
  Serial.begin(115200);     // Start serial monitor

  scale.begin(DT_PIN, SCK_PIN); // Initialize HX711 load cell

  SPI.begin();                 // Start SPI bus
  mfrc522.PCD_Init();          // Init RFID reader

  connectWiFi();               // Connect WiFi

  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer); // Sync time via NTP

  config.database_url = FIREBASE_HOST;                  // Firebase URL
  config.signer.tokens.legacy_token = FIREBASE_AUTH;    // Auth token
  Firebase.begin(&config, &auth);                       // Initialize Firebase

  scale.set_scale(calibration_factor);  // Set calibration
  scale.tare();                         // Reset to zero

  Serial.println("Load Cell + RFID Ready 🎯");
}

// -----------------------------------------------------
// LOOP
// -----------------------------------------------------
void loop() {
  float weight = getWeight();                       // Read load cell
  String status = (weight >= 500) ? "AVAILABLE" : "UNAVAILABLE";  
  // AVAILABLE only if weight is >= 500g

  updateFirebase(weight, status);                  // Push weight + status

  handleRFID();                                    // Check RFID scans
  delay(150);                                      // Fast loop for better scanning
}
