#include <ESP8266WiFi.h>
#include <Firebase_ESP_Client.h>
#include <NewPing.h>

// ===================================
// 1. CONFIGURATION
// ===================================

// --- WiFi Credentials ---
#define WIFI_SSID "Hirantha's Galaxy M31"
#define WIFI_PASSWORD "Hira@2413"

// --- Firebase Configuration ---
// NOTE: Ensure your Firebase project is configured for Email/Password sign-in
#define DATABASE_URL "https://smartgymtracker-4123b-default-rtdb.firebaseio.com"
#define API_KEY "AIzaSyDqzB125_DD0slXXpaBfVBgKoGgRNO5LM0"
#define USER_EMAIL "customer1@gmail.com"
#define USER_PASSWORD "user123"

// --- Firebase Database Paths ---
const String BENCH_PATH = "/equipment/bench1";
const String MOTOR_PATH = "/equipment/motor_current_sensor_1";


// --- Ultrasonic Sensor (Bench) Config ---
#define TRIGGER_PIN1 5   // D1 on NodeMCU
#define ECHO_PIN1 4      // D2 on NodeMCU
#define TRIGGER_PIN2 14  // D5 on NodeMCU
#define ECHO_PIN2 12     // D6 on NodeMCU
#define THRESHOLD_CM 20  // Bench Occupied threshold



// --- Current Sensor (Motor) Config ---
#define CURRENT_SENSOR_PIN A0 
// Analog value (0-1023). Tune this threshold based on testing. 
// A value >= this indicates the motor is running/in use.
const int USAGE_THRESHOLD = 10; 

// ===================================
// 2. GLOBAL OBJECTS
// ===================================
#define MAX_DISTANCE 100   // Maximum range of HC-SR04 in cm

NewPing sonar1(TRIGGER_PIN1, ECHO_PIN1, MAX_DISTANCE);
NewPing sonar2(TRIGGER_PIN2, ECHO_PIN2, MAX_DISTANCE);

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;


// ===================================
// 3. SETUP
// ===================================
void setup() {
  Serial.begin(115200);
  Serial.println("\nStarting Gym Tracker...");

  // --- WiFi Connection ---
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected! IP: " + WiFi.localIP().toString());
  
  // --- Firebase Initialization ---
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;

  // Set the Email and Password for Firebase Authentication
  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  // Wait for the Firebase sign-in process to complete
  Serial.println("Authenticating with Firebase...");
while (!Firebase.ready()) {
  Serial.print(".");
  delay(500);
}
Serial.println("\nFirebase Ready ✅");


  // Ensure analog pin is set to input (good practice)
  pinMode(CURRENT_SENSOR_PIN, INPUT); 
}


// ===================================
// 4. BENCH TRACKER LOGIC (ULTRASONIC)
// ===================================

void updateBenchStatus() {
  // Read distance from both sensors
  // NewPing uses delay(60) internally, so we read consecutively
  unsigned int dist1 = sonar1.ping_cm(); 
  delay(60); 
  unsigned int dist2 = sonar2.ping_cm();

  // If NewPing returns 0, it means the object is out of range or distance is invalid. 
  // We treat 0 as max distance (or just a large number)
  if (dist1 == 0) dist1 = MAX_DISTANCE + 1;
  if (dist2 == 0) dist2 = MAX_DISTANCE + 1;

  // Status: 1 (Occupied) if EITHER sensor is below the threshold, 0 (Free) otherwise.
  int status = (dist1 < THRESHOLD_CM || dist2 < THRESHOLD_CM) ? 1 : 0;
  String status_label = (status == 1) ? "OCCUPIED" : "FREE";

  Serial.println("\n--- Bench Tracker ---");
  Serial.print("D1: "); Serial.print(dist1);
  Serial.print(" cm  |  D2: "); Serial.print(dist2);
  Serial.println(" cm");
  Serial.println("Bench Status: " + status_label);

  // Write Bench Status (int) to Firebase
  if (Firebase.RTDB.setInt(&fbdo, BENCH_PATH + "/status", status)) {
    Serial.println("Bench Status Write: SUCCESS ✅");
  } else {
    Serial.print("Bench Status Write ERROR ❌ → ");
    Serial.println(fbdo.errorReason());
  }
}


// ===================================
// 5. MOTOR TRACKER LOGIC (CURRENT SENSOR)
// ===================================

void updateMotorStatus() {
  // Read raw current sensor value (0-1023)
  int rawReading = analogRead(CURRENT_SENSOR_PIN);

  // Determine status based on the configured usage threshold
  // High current (>= threshold) means motor is running = UNAVAILABLE/IN_USE
  String status = (rawReading >= USAGE_THRESHOLD) ? "UNAVAILABLE" : "AVAILABLE";
  
  Serial.println("\n--- Motor Tracker ---");
  Serial.println("Raw Reading (A0): " + String(rawReading));
  Serial.println("Motor Status: " + status);

  // Write Raw Reading (int) to Firebase
  if (Firebase.RTDB.setInt(&fbdo, MOTOR_PATH + "/raw_sensor_reading", rawReading)) {
    Serial.println("Raw Reading Write: SUCCESS ✅");
  } else {
    Serial.print("Raw Reading Write ERROR ❌ → ");
    Serial.println(fbdo.errorReason());
  }
  
  // Write Motor Status (String) to Firebase
  if (Firebase.RTDB.setString(&fbdo, MOTOR_PATH + "/status", status)) {
    Serial.println("Motor Status Write: SUCCESS ✅");
  } else {
    Serial.print("Motor Status Write ERROR ❌ → ");
    Serial.println(fbdo.errorReason());
  }
}


// ===================================
// 6. MAIN LOOP
// ===================================
void loop() {
  // Ensure Firebase is ready before attempting writes
  if (Firebase.ready()) {
    updateBenchStatus();
    updateMotorStatus();
  } else {
    Serial.println("Firebase not yet ready or failed to connect.");
  }

  // Update frequency control
  delay(1000); 
}