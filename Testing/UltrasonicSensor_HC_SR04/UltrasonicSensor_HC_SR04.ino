#include <ESP8266WiFi.h>
#include <Firebase_ESP_Client.h>
#include <NewPing.h>

// WiFi
#define WIFI_SSID "Sherin's A23 5G"
#define WIFI_PASSWORD "qwer1234"

// Firebase
#define DATABASE_URL "https://smartgymtracker-4123b-default-rtdb.firebaseio.com"
#define API_KEY "AIzaSyDqzB125_DD0slXXpaBfVBgKoGgRNO5LM0"

// Ultrasonic
#define TRIGGER_PIN1  5
#define ECHO_PIN1     4
#define TRIGGER_PIN2  14
#define ECHO_PIN2     12
#define MAX_DISTANCE 100
#define THRESHOLD_CM 20

NewPing sonar1(TRIGGER_PIN1, ECHO_PIN1, MAX_DISTANCE);
NewPing sonar2(TRIGGER_PIN2, ECHO_PIN2, MAX_DISTANCE);

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

void setup() {
  Serial.begin(115200);

  // WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected!");

  // Firebase
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;

  // Anonymous login
  auth.user.email = "equiqment@gmail.com";
  auth.user.password = "123456";

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  Serial.println("Firebase Ready ✅");
}

void loop() {
  unsigned int dist1 = sonar1.ping_cm();
  delay(60);
  unsigned int dist2 = sonar2.ping_cm();

  if (dist1 == 0) dist1 = 999;
  if (dist2 == 0) dist2 = 999;

  int status = (dist1 < THRESHOLD_CM || dist2 < THRESHOLD_CM) ? 1 : 0;

  Serial.print("Bench Status → ");
  Serial.println(status == 1 ? "OCCUPIED" : "FREE");

  if (Firebase.RTDB.setInt(&fbdo, "/equipment/bench1/status", status)) {
    Serial.println("Firebase Write: SUCCESS ✅");
  } else {
    Serial.print("Firebase ERROR ❌ → ");
    Serial.println(fbdo.errorReason());
  }

  Serial.print("D1: "); Serial.print(dist1);
  Serial.print(" cm  |  D2: "); Serial.println(dist2);

  delay(1000);
}
