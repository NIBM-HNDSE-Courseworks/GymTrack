#include <ESP8266WiFi.h>
#include <Firebase_ESP_Client.h>
#include <NewPing.h>

// WiFi
#define WIFI_SSID "HUAWEI MATE 40 PRO"
#define WIFI_PASSWORD "qwertyuiop"

// Firebase
#define DATABASE_URL "https://smartgymtracker-4123b-default-rtdb.firebaseio.com"
#define API_KEY "AIzaSyDqzB125_DD0slXXpaBfVBgKoGgRNO5LM0"

// Ultrasonic Pins
#define TRIGGER_PIN1  5
#define ECHO_PIN1     4
#define TRIGGER_PIN2  14
#define ECHO_PIN2     12
#define MAX_DISTANCE  100
#define THRESHOLD_CM  20

NewPing sonar1(TRIGGER_PIN1, ECHO_PIN1, MAX_DISTANCE);
NewPing sonar2(TRIGGER_PIN2, ECHO_PIN2, MAX_DISTANCE);

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

void setup() {
  Serial.begin(115200);
  Serial.println("\n\n===== SYSTEM STARTING =====");

  // WiFi
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
  Serial.println("=====================================");

  // Firebase Setup
  Serial.println("\nSetting up Firebase...");
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;

  auth.user.email = "customer1@gmail.com";
  auth.user.password = "user123";

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  Serial.println("Firebase Ready ✅");
  Serial.println("=====================================\n");

  // Sensor Pin Info
  Serial.println("Ultrasonic Sensor Pin Mapping:");
  Serial.print("Sensor 1 TRIG: "); Serial.println(TRIGGER_PIN1);
  Serial.print("Sensor 1 ECHO: "); Serial.println(ECHO_PIN1);
  Serial.print("Sensor 2 TRIG: "); Serial.println(TRIGGER_PIN2);
  Serial.print("Sensor 2 ECHO: "); Serial.println(ECHO_PIN2);
  Serial.println("=====================================\n");
}

void loop() {
  Serial.println("\n----- NEW LOOP RUN -----");

  Serial.println("Reading Sensor 1...");
  unsigned int dist1 = sonar1.ping_cm();
  Serial.print("Raw Distance S1 = ");
  Serial.println(dist1);

  delay(60);

  Serial.println("Reading Sensor 2...");
  unsigned int dist2 = sonar2.ping_cm();
  Serial.print("Raw Distance S2 = ");
  Serial.println(dist2);

  // If sensor fails → treat as far (no object)
  if (dist1 == 0) {
    Serial.println("S1 returned 0 → setting to 999 (no echo)");
    dist1 = 999;
  }
  if (dist2 == 0) {
    Serial.println("S2 returned 0 → setting to 999 (no echo)");
    dist2 = 999;
  }

  Serial.print("FINAL D1 = "); Serial.print(dist1); Serial.println(" cm");
  Serial.print("FINAL D2 = "); Serial.print(dist2); Serial.println(" cm");

  // Occupied logic
  int status = (dist1 < THRESHOLD_CM || dist2 < THRESHOLD_CM) ? 1 : 0;

  Serial.print("THRESHOLD = ");
  Serial.println(THRESHOLD_CM);

  Serial.print("Calculated Status = ");
  Serial.println(status == 1 ? "OCCUPIED" : "FREE");

  // Write occupied/free status
  Serial.println("Sending status to Firebase...");
  if (Firebase.RTDB.setInt(&fbdo, "/equipment/bench1/status", status)) {
    Serial.println("Firebase Status Update → SUCCESS");
  } else {
    Serial.print("Firebase ERROR ❌ → ");
    Serial.println(fbdo.errorReason());
  }

  // NEW: Write minimum distance
  int minDist = min(dist1, dist2);
  Serial.print("Minimum Distance = ");
  Serial.println(minDist);

  Serial.println("Sending distance to Firebase...");
  if (Firebase.RTDB.setInt(&fbdo, "/equipment/bench1/distance", minDist)) {
    Serial.println("Firebase Distance Update → SUCCESS");
  } else {
    Serial.print("Firebase ERROR ❌ → ");
    Serial.println(fbdo.errorReason());
  }

  Serial.println("----- LOOP END -----\n");
  delay(1000);
}
