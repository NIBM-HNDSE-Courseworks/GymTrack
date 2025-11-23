// -----------------------------------------------------
// LoadCell_RFID_Tracker.ino (ESP8266 + HX711 + MFRC522 + Firebase)
// -----------------------------------------------------

#include <ESP8266WiFi.h>
#include <FirebaseESP8266.h>
#include <SPI.h> // For MFRC522
#include "HX711.h" // For Load Cell
#include <MFRC522.h> // For RFID

// --- WiFi ---
// *** Using Load Cell's WiFi credentials (Galaxy A04s 093A) for consistency ***
#define WIFI_SSID "Hirantha's Galaxy M31"
#define WIFI_PASSWORD "Hira@2413"

// --- Firebase (Shared) ---
#define FIREBASE_HOST "smartgymtracker-4123b-default-rtdb.firebaseio.com"
#define FIREBASE_AUTH "RCq1FclKIALVguVHCAnNLwmCAvPH9i28PMiGgS1Z"

// --- Load Cell Pins ---
#define DT_PIN D3
#define SCK_PIN D4
HX711 scale;

// Set your calibration factor here
float calibration_factor = 732.0; // <<< Use your final calibrated factor

// --- RFID Pins ---
#define RST_PIN D2
#define SS_PIN D1
MFRC522 mfrc522(SS_PIN, RST_PIN);

// --- EQUIPMENT CONFIG (Load Cell) ---
const String EQUIPMENT_NODE_ID = "load_cell_1";
const String FIREBASE_BASE_PATH = "/equipment/" + EQUIPMENT_NODE_ID;

// Firebase objects (Shared)
FirebaseData firebaseData;
FirebaseAuth auth;
FirebaseConfig config;


// -----------------------------------------------------
// 🌐 Connect WiFi (Shared Function)
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
// 📏 Load Cell Functions
// -----------------------------------------------------

// Read stable weight
float getWeight() {
  if (scale.is_ready()) {
    float reading = scale.get_units(5); // average 5 readings
    return reading;
  }
  return 0.0;
}

// Update Firebase for Load Cell data
void updateFirebase(float weight, String status) {
  String basePath = FIREBASE_BASE_PATH; 

  // Update Weight and Status
  Firebase.setFloat(firebaseData, basePath + "/weight", weight);
  Firebase.setString(firebaseData, basePath + "/status", status);

  // Optional: Add other info for clarity in Firebase
  Firebase.setString(firebaseData, basePath + "/equipment_id", EQUIPMENT_NODE_ID);
  Firebase.setFloat(firebaseData, basePath + "/timestamp", millis());


  Serial.println("Firebase Updated:");
  Serial.println("Path: " + basePath);
  Serial.println("Weight: " + String(weight, 2));
  Serial.println("Status: " + status);
}

// -----------------------------------------------------
// 💳 RFID Functions
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

// Utility function to get String from Firebase
String fbGetString(String path) {
  if (Firebase.getString(firebaseData, path)) return firebaseData.stringData();
  return "";
}

// Utility function to get Int from Firebase
int fbGetInt(String path, int fallback = 0) {
  if (Firebase.getInt(firebaseData, path)) return firebaseData.intData();
  return fallback;
}

void handleRFID() {
  if (!mfrc522.PICC_IsNewCardPresent() || !mfrc522.PICC_ReadCardSerial()) {
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

// -----------------------------------------------------
// 🛠️ Setup (Merged)
// -----------------------------------------------------
void setup() {
  Serial.begin(115200);

  // Load Cell Setup
  scale.begin(DT_PIN, SCK_PIN);
  Serial.println("Starting Load Cell...");

  // RFID Setup
  SPI.begin();
  mfrc522.PCD_Init();
  Serial.println("Starting RFID Reader...");

  // WiFi Connection (Shared)
  connectWiFi();

  // Firebase Init (Shared)
  config.database_url = FIREBASE_HOST;
  config.signer.tokens.legacy_token = FIREBASE_AUTH;
  Firebase.begin(&config, &auth);

  // Load Cell Calibration
  scale.set_scale(calibration_factor);
  scale.tare();   // zero the scale

  Serial.println("Load Cell & RFID Ready 🎯");
}

// -----------------------------------------------------
// 🔁 Main Loop (Merged)
// -----------------------------------------------------
void loop() {
  // --- Load Cell Logic ---
  float weight = getWeight();

  Serial.println("--------------------------");
  Serial.println("Weight: " + String(weight, 2) + " g");

  // Status is "AVAILABLE" if weight is 500g or more.
  // Status is "UNAVAILABLE" if weight is less than 500g.
  String status = (weight >= 500.0) ? "AVAILABLE" : "UNAVAILABLE";

  updateFirebase(weight, status);

  // --- RFID Logic ---
  handleRFID();
  
  // Delay for the overall loop
  delay(1000); // update every 1 sec
}