// -----------------------------------------------------
// CurrentSensor_Tracker.ino (ESP8266 + Current Sensor + Firebase)
// -----------------------------------------------------

#include <ESP8266WiFi.h>
#include <FirebaseESP8266.h>

// --- WiFi ---
#define WIFI_SSID "Hirantha's Galaxy M31"
#define WIFI_PASSWORD "Hira@2413"

// --- Firebase ---
#define FIREBASE_HOST "smartgymtracker-4123b-default-rtdb.firebaseio.com"
#define FIREBASE_AUTH "RCq1FclKIALVguVHCAnNLwmCAvPH9i28PMiGgS1Z"

// --- Current Sensor Pin ---
// The ESP8266's analog input pin.
#define CURRENT_SENSOR_PIN A0 

// --- Sensor Configuration ---
// Adjust this threshold based on testing. 
// A value above this will indicate the motor is drawing current (i.e., in use).
// Typical idle noise on A0 might be around 0-50. A motor running will be much higher.
const int USAGE_THRESHOLD = 80; // Analog value (0-1023). **Tune this!**

// Firebase objects
FirebaseData firebaseData;
FirebaseAuth auth;
FirebaseConfig config;

// --- EQUIPMENT CONFIG ---
const String EQUIPMENT_NODE_ID = "motor_current_sensor_1"; // Updated ID for clarity
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

  // Initialize analog pin (though not strictly necessary for analogRead)
  pinMode(CURRENT_SENSOR_PIN, INPUT); 

  Serial.println("Starting Current Sensor Tracker...");
  connectWiFi();

  config.database_url = FIREBASE_HOST;
  config.signer.tokens.legacy_token = FIREBASE_AUTH;
  Firebase.begin(&config, &auth);

  Serial.println("Tracker Ready 🎯");
}

// -----------------------------------------------------
// Read raw current sensor value (0-1023)
// -----------------------------------------------------
int getCurrentReading() {
  // ESP8266 analogRead returns a value between 0 and 1023
  int rawReading = analogRead(CURRENT_SENSOR_PIN);
  return rawReading;
}

// -----------------------------------------------------
// Update Firebase
// -----------------------------------------------------
void updateFirebase(int reading, String status) {
  String basePath = FIREBASE_BASE_PATH; 

  // Update Raw Reading and Status
  // Changed to setInt for the raw sensor value (0-1023)
  Firebase.setInt(firebaseData, basePath + "/raw_sensor_reading", reading);
  Firebase.setString(firebaseData, basePath + "/status", status);

  // Optional: Add other info for clarity in Firebase
  Firebase.setString(firebaseData, basePath + "/equipment_id", EQUIPMENT_NODE_ID);
  Firebase.setFloat(firebaseData, basePath + "/timestamp", millis());


  Serial.println("Firebase Updated:");
  Serial.println("Path: " + basePath);
  Serial.println("Raw Reading: " + String(reading));
  Serial.println("Status: " + status);
}

// -----------------------------------------------------
// Main Loop
// -----------------------------------------------------
void loop() {
  int rawReading = getCurrentReading();

  Serial.println("--------------------------");
  Serial.println("Raw Reading (A0): " + String(rawReading));

  // **NEW LOGIC:**
  // Motor is WORKING (drawing current) -> status is "IN_USE"
  // Motor is NOT WORKING (no current) -> status is "AVAILABLE"

  // Check if the reading is above the usage threshold
  // The logic is inverted from the load cell: High current = In Use / Unavailable
  String status = (rawReading >= USAGE_THRESHOLD) ? "UNAVAILABLE" : "AVAILABLE";
  
  updateFirebase(rawReading, status);

  delay(1000); // update every 1 sec
}