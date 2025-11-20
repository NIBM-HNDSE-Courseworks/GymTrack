// RFID_UserTracking.ino
// Updated to resolve card -> customer mapping and print customer name.
// Uses FirebaseESP8266 library.

#include <ESP8266WiFi.h>
#include <FirebaseESP8266.h>
#include <SPI.h>
#include <MFRC522.h>

// --- WiFi ---
#define WIFI_SSID "Murdock A05s"
#define WIFI_PASSWORD "20060905"

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
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
    Serial.print(".");
    // avoid infinite loop on boot if WiFi unavailable
    if (millis() - start > 30000) {
      Serial.println();
      Serial.println("WiFi connect timeout. Rebooting...");
      ESP.restart();
    }
  }
  Serial.println("\nWiFi Connected ✅");
}

String buildCardID() {
  String cardID = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) cardID += "0";
    cardID += String(mfrc522.uid.uidByte[i], HEX);
  }
  cardID.toUpperCase();
  return cardID;
}

// Helper: reads string from path, returns empty string if not exists
String fbGetString(const String &path) {
  if (Firebase.getString(firebaseData, path)) {
    return firebaseData.stringData();
  }
  return "";
}

// Helper: reads int from path, returns fallback if not exists
int fbGetInt(const String &path, int fallback = 0) {
  if (Firebase.getInt(firebaseData, path)) {
    return firebaseData.intData();
  }
  return fallback;
}

void setup() {
  Serial.begin(115200);
  SPI.begin();
  mfrc522.PCD_Init();
  Serial.println("RFID Reader initializing...");
  connectWiFi();

  config.database_url = FIREBASE_HOST;
  config.signer.tokens.legacy_token = FIREBASE_AUTH;

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  Serial.println("Setup complete, ready to scan RFID cards 🎯");
}

void loop() {
  // Wait for new card
  if (!mfrc522.PICC_IsNewCardPresent()) {
    delay(100);
    return;
  }
  if (!mfrc522.PICC_ReadCardSerial()) {
    delay(100);
    return;
  }

  String cardID = buildCardID();
  Serial.println("-----------------------------");
  Serial.print("RFID card detected: ");
  Serial.println(cardID);

  // Publish to frontend as before
  if (!Firebase.setString(firebaseData, "/last_scanned_card", cardID)) {
    Serial.println("Failed to write /last_scanned_card to Firebase");
  }

  // Check users/<cardID>/uid -> this should contain customerId (if assigned)
  String userUidPath = "/users/" + cardID + "/uid";
  String linkedCustomerId = fbGetString(userUidPath); // empty if not set

  if (linkedCustomerId == "") {
    // Unassigned card
    Serial.println("Card is currently UNASSIGNED.");
    // If user node doesn't exist, create it (registered = true) and set inside = 1 as before
    String userRoot = "/users/" + cardID;
    // create node if not created
    if (!Firebase.getJSON(firebaseData, userRoot)) {
      Serial.println("Creating basic user node for this card...");
      Firebase.setBool(firebaseData, userRoot + "/registered", true);
      Firebase.setInt(firebaseData, userRoot + "/inside", 1);
      Serial.println("User registered ✅, Entry status set to 1️⃣");
    } else {
      // If node exists but no uid, toggle inside like unassigned logic earlier
      int inside = fbGetInt(userRoot + "/inside", 0);
      int newStatus = (inside == 1 ? 0 : 1);
      if (Firebase.setInt(firebaseData, userRoot + "/inside", newStatus)) {
        Serial.println(newStatus == 1 ? "Unassigned card Entry 🔼" : "Unassigned card Exit 🔽");
      } else {
        Serial.println("Failed to update inside status for unassigned card.");
      }
    }
    Serial.println("Scan done. Waiting for next scan.\n");
    delay(1200);
    return;
  }

  // If we have a linked customerId, fetch customer's name (and optionally email)
  String customerName = fbGetString("/customers/" + linkedCustomerId + "/name");
  String customerEmail = fbGetString("/customers/" + linkedCustomerId + "/email");

  // Fallback when name missing
  if (customerName == "") customerName = "(unknown customer)";

  // Informational Serial output
  Serial.print("Card belongs to customerId: ");
  Serial.println(linkedCustomerId);
  Serial.print("Customer: ");
  Serial.print(customerName);
  if (customerEmail != "") {
    Serial.print(" <");
    Serial.print(customerEmail);
    Serial.print(">");
  }
  Serial.println();

  // Toggle inside status in users/<cardID>/inside (preserve previous behavior)
  String insidePath = "/users/" + cardID + "/inside";
  int currentInside = fbGetInt(insidePath, 0);
  int newInside = (currentInside == 1 ? 0 : 1);

  if (Firebase.setInt(firebaseData, insidePath, newInside)) {
    if (newInside == 1) {
      Serial.print("Customer ");
      Serial.print(customerName);
      Serial.println(" has ENTERED the gym 🔼");
    } else {
      Serial.print("Customer ");
      Serial.print(customerName);
      Serial.println(" has EXITED the gym 🔽");
    }
  } else {
    Serial.println("Failed to update inside status for assigned card.");
  }

  Serial.println("Scan done. Ready for next...\n");
  delay(1200);
}
