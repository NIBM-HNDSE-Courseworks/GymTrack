//----------RFID - User Tracking----------

#include <ESP8266WiFi.h>
#include <FirebaseESP8266.h>
#include <SPI.h>
#include <MFRC522.h>

// --- WiFi ---
#define WIFI_SSID "HUAWEI MATE 40 PRO"
#define WIFI_PASSWORD "qwertyuiop"

// --- Firebase ---
#define FIREBASE_HOST "smartgymtracker-4123b-default-rtdb.firebaseio.com"
#define FIREBASE_AUTH "RCq1FclKIALVguVHCAnNLwmCAvPH9i28PMiGgS1Z"

// --- RFID ---
#define RST_PIN D2
#define SS_PIN D1
MFRC522 mfrc522(SS_PIN, RST_PIN);

// --- Firebase Objects ---
FirebaseData firebaseData;
FirebaseAuth auth;
FirebaseConfig config;

void connectWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected ✅");
}

void setup() {
  Serial.begin(115200);
  SPI.begin();
  mfrc522.PCD_Init();
  connectWiFi();

  config.database_url = FIREBASE_HOST;
  config.signer.tokens.legacy_token = FIREBASE_AUTH;

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  Serial.println("Setup complete, ready to scan RFID cards 🎯");
}

void loop() {
  // Wait for new card
  if (!mfrc522.PICC_IsNewCardPresent()) return;
  if (!mfrc522.PICC_ReadCardSerial()) return;

  Serial.println("RFID card detected! 🆔");

  // Build Card ID
  String cardID = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) cardID += "0";
    cardID += String(mfrc522.uid.uidByte[i], HEX);
  }
  cardID.toUpperCase();

  Serial.print("Card ID: ");
  Serial.println(cardID);

  // 🔥 Push to frontend listener
  Firebase.setString(firebaseData, "/last_scanned_card", cardID);

  // Check if user exists
  String path = "/users/" + cardID;

  if (!Firebase.getJSON(firebaseData, path)) {
    Serial.println("New user detected! Creating Firebase node...");
    Firebase.setBool(firebaseData, path + "/registered", true);
    Firebase.setInt(firebaseData, path + "/inside", 1);

    Serial.println("User registered ✅, Entry status set to 1️⃣");
    delay(1500);
    return;
  }

  Serial.println("Registered user found. Checking inside status...");

  if (Firebase.getInt(firebaseData, path + "/inside")) {
    int isInside = firebaseData.intData();

    Serial.print("Current inside status: ");
    Serial.println(isInside);

    int newStatus = (isInside == 1 ? 0 : 1);

    if (Firebase.setInt(firebaseData, path + "/inside", newStatus)) {
      Serial.println(newStatus == 1 ? "User Entry 🔼" : "User Exit 🔽");
    } else {
      Serial.println("Status update failed ❌");
    }

  } else {
    Serial.println("Cannot read inside status ❌");
  }

  Serial.println("Scan done. Ready for next...\n");
  delay(1500);
}
