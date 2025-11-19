#include <ESP8266WiFi.h>
#include <FirebaseESP8266.h>

// --- WiFi ---
#define WIFI_SSID "HUAWEI MATE 40 PRO"
#define WIFI_PASSWORD "qwertyuiop"

// --- Firebase ---
#define FIREBASE_HOST "https://smartgymtracker-4123b-default-rtdb.firebaseio.com/"
#define FIREBASE_AUTH "RCq1FclKIALVguVHCAnNLwmCAvPH9i28PMiGgS1Z"

// --- Equipment ---
const String EQUIPMENT_ID = "BLK-001";
const String EQUIPMENT_NAME = "Blinking Status Simulator";
const int STATUS_UPDATE_INTERVAL_MS = 5000;
const int LED_PIN = LED_BUILTIN;

FirebaseData firebaseData;
FirebaseConfig config;
FirebaseAuth auth;

unsigned long lastUpdateTime = 0;
String currentStatus = "FREE";
bool ledState = LOW;

void connectToWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
}

void sendStatusToFirebase(String status) {
  String path = "/equipment_data/" + EQUIPMENT_ID;

  FirebaseJson json;
  json.set("equipment_id", EQUIPMENT_ID);
  json.set("equipment_name", EQUIPMENT_NAME);
  json.set("timestamp", (long)Firebase.getCurrentTime());
  json.set("status", status);

  FirebaseJson rawData;
  rawData.set("is_blinking", (status == "IN USE"));
  rawData.set("raw_led_state", ledState);
  json.set("raw_data", rawData);

  Serial.print("Sending to Firebase: ");
  Serial.println(status);

  if (Firebase.setJSON(firebaseData, path, json)) {
    Serial.println("✔ Successfully uploaded.");
  } else {
    Serial.print("❌ Firebase Error: ");
    Serial.println(firebaseData.errorReason());
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, HIGH);

  connectToWiFi();

  // --- Correct Firebase Setup ---
  config.database_url = FIREBASE_HOST;
  config.signer.tokens.legacy_token = FIREBASE_AUTH;

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  sendStatusToFirebase("FREE");
  lastUpdateTime = millis();
}

void loop() {
  if (millis() % 10000 < 5000) {
    digitalWrite(LED_PIN, HIGH);
    ledState = HIGH;
    currentStatus = "FREE";
  } else {
    digitalWrite(LED_PIN, LOW);
    ledState = LOW;
    currentStatus = "IN USE";
  }

  if (millis() - lastUpdateTime >= STATUS_UPDATE_INTERVAL_MS) {
    sendStatusToFirebase(currentStatus);
    lastUpdateTime = millis();
  }

  delay(100);
}
