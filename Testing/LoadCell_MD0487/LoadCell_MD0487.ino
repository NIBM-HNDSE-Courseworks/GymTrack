// -----------------------------------------------------
// LoadCell_Tracker.ino (ESP8266 + HX711 + Firebase)
// -----------------------------------------------------

#include <ESP8266WiFi.h>
#include <FirebaseESP8266.h>
#include "HX711.h"

// --- WiFi ---
#define WIFI_SSID "Hirantha's Galaxy M31"
#define WIFI_PASSWORD "Hira@2413"

// --- Firebase ---
#define FIREBASE_HOST "smartgymtracker-4123b-default-rtdb.firebaseio.com"
#define FIREBASE_AUTH "RCq1FclKIALVguVHCAnNLwmCAvPH9i28PMiGgS1Z"

// --- Load Cell Pins ---
#define DT_PIN D3
#define SCK_PIN D4

HX711 scale;

// Set your calibration factor here
float calibration_factor = 732.0; // <<< Use your final calibrated factor

// Firebase objects
FirebaseData firebaseData;
FirebaseAuth auth;
FirebaseConfig config;

// --- EQUIPMENT CONFIG ---
// **THIS IS THE NEW, CLEANER PATH IN FIREBASE**
const String EQUIPMENT_NODE_ID = "load_cell_1";
const String FIREBASE_BASE_PATH = "/equipment/" + EQUIPMENT_NODE_ID;

// -----------------------------------------------------
// Connect WiFi
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
// Setup
// -----------------------------------------------------
void setup() {
  Serial.begin(115200);

  scale.begin(DT_PIN, SCK_PIN);

  Serial.println("Starting Load Cell...");
  connectWiFi();

  config.database_url = FIREBASE_HOST;
  config.signer.tokens.legacy_token = FIREBASE_AUTH;
  Firebase.begin(&config, &auth);

  scale.set_scale(calibration_factor);
  scale.tare();   // zero the scale

  Serial.println("Load Cell Ready 🎯");
}

// -----------------------------------------------------
// Read stable weight
// -----------------------------------------------------
float getWeight() {
  if (scale.is_ready()) {
    float reading = scale.get_units(5); // average 5 readings
    return reading;
  }
  return 0.0;
}

// -----------------------------------------------------
// Update Firebase
// -----------------------------------------------------
void updateFirebase(float weight, String status) {
  // *** PATH CHANGED HERE ***
  String basePath = FIREBASE_BASE_PATH; // Now uses /equipment/load_cell_1

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
// Main Loop
// -----------------------------------------------------
void loop() {
  float weight = getWeight();

  Serial.println("--------------------------");
  Serial.println("Weight: " + String(weight, 2) + " g");

  // *** ORIGINAL LOGIC RESTORED ***a
  // Status is "AVAILABLE" if weight is 500g or more.
  // Status is "UNAVAILABLE" if weight is less than 500g.
  String status = (weight >= 500.0) ? "AVAILABLE" : "UNAVAILABLE";

  updateFirebase(weight, status);

  delay(1000); // update every 1 sec
}