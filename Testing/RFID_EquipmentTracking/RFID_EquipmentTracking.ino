#include <ESP8266WiFi.h>
#include <FirebaseESP8266.h>
#include <SPI.h>
#include <MFRC522.h>

// --- WIFI CONFIGURATION ---
#define WIFI_SSID "Murdock A05s"
#define WIFI_PASSWORD "20060905"

// --- FIREBASE CONFIGURATION ---
#define FIREBASE_HOST "smartgymtracker-4123b-default-rtdb.firebaseio.com"
#define FIREBASE_AUTH "RCq1FclKIALVguVHCAnNLwmCAvPH9i28PMiGgS1Z"

// Define Firebase Data object and config/auth
FirebaseData firebaseData;
FirebaseAuth auth;
FirebaseConfig config;

// --- PIN DEFINITIONS ---
#define RST_PIN_1 D3    // Reader 1: EQUIPMENT Area (Docking Station)
#define SS_PIN_1 D8
#define RST_PIN_2 D4    // Reader 2: Dumbbell Space (Free Space)
#define SS_PIN_2 D2
#define RST_PIN_3 D0    // Reader 3: Free Area (Dumbbell Area)
#define SS_PIN_3 D1

// Create three MFRC522 instances
MFRC522 reader1(SS_PIN_1, RST_PIN_1);
MFRC522 reader2(SS_PIN_2, RST_PIN_2);
MFRC522 reader3(SS_PIN_3, RST_PIN_3);

// -----------------------------------------------------------------
//                          HELPER FUNCTIONS
// -----------------------------------------------------------------

/**
 * @brief Converts a MFRC522::Uid into an uppercase hex string.
 */
String getTagId(MFRC522::Uid currentUID) {
  String cardID = "";
  for (byte i = 0; i < currentUID.size; i++) {
    if (currentUID.uidByte[i] < 0x10) cardID += "0";
    cardID += String(currentUID.uidByte[i], HEX);
  }
  cardID.toUpperCase(); // modifies in place
  return cardID;
}

/**
 * @brief Connects to Wi-Fi.
 */
void connectWiFi() {
    Serial.print("Connecting WiFi");
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    while (WiFi.status() != WL_CONNECTED) {
        Serial.print(".");
        delay(300);
    }
    Serial.println("\nWiFi Connected [OK]");
}

/**
 * @brief Helper: check whether a path exists in the RTDB.
 * @return true if the path exists (not null), false otherwise.
 */
bool pathExists(const String &path) {
    if (Firebase.get(firebaseData, path)) {
        // dataType will be "null" if key doesn't exist
        String dt = firebaseData.dataType();
        // Debug print
        // Serial.print("[DEBUG] pathExists("); Serial.print(path); Serial.print(") dataType="); Serial.println(dt);
        return dt != "null";
    } else {
        Serial.print("[ERROR] Firebase GET failed for ");
        Serial.print(path);
        Serial.print(" : ");
        Serial.println(firebaseData.errorReason());
        // conservative: treat as not exists so we can create pending later
        return false;
    }
}

/**
 * @brief Update the location + timestamp under /equipment/<tagId>
 */
void updateEquipmentLocation(const String &tagId, const String &location) {
    String path = "/equipment/" + tagId;
    FirebaseJson json;
    json.set("rfid_tag", tagId);
    json.set("location", location);
    // Keep existing name if present in DB — we'll not touch it here.
    // Timestamp as millis() (or you can use epoch seconds if you prefer)
    json.set("timestamp", (int)millis());

    Serial.print("[FIREBASE] Updating equipment location for ");
    Serial.print(tagId);
    Serial.print(" -> ");
    Serial.println(location);

    // Use update (set will replace; update changes only fields provided)
    if (Firebase.updateNode(firebaseData, path, json)) {
        Serial.println("[SUCCESS] Equipment location updated.");
    } else {
        Serial.print("[ERROR] Firebase update failed: ");
        Serial.println(firebaseData.errorReason());
    }
}

/**
 * @brief Create a pending_items/<tagId> entry (PENDING_NAME_ASSIGNMENT)
 */
void createPendingItem(const String &tagId, const String &initialLocation) {
    String path = "/pending_items/" + tagId;
    FirebaseJson json;
    json.set("rfid_tag", tagId);
    json.set("initial_location", initialLocation);
    json.set("status", "PENDING_NAME_ASSIGNMENT");
    json.set("timestamp", (int)millis());

    Serial.print("[FIREBASE] Creating pending item ");
    Serial.print(tagId);
    Serial.print(" at ");
    Serial.println(path);

    if (Firebase.set(firebaseData, path, json)) {
        Serial.println("[SUCCESS] Pending item created.");
    } else {
        Serial.print("[ERROR] Firebase pending set failed: ");
        Serial.println(firebaseData.errorReason());
    }
}

/**
 * @brief Create a new equipment/<tagId> with a given name (used for Reader 2/3 auto-naming)
 */
void createEquipmentWithName(const String &tagId, const String &name, const String &location) {
    String path = "/equipment/" + tagId;
    FirebaseJson json;
    json.set("rfid_tag", tagId);
    json.set("name", name);
    json.set("location", location);
    json.set("timestamp", (int)millis());

    Serial.print("[FIREBASE] Creating equipment ");
    Serial.print(tagId);
    Serial.print(" name=");
    Serial.print(name);
    Serial.print(" location=");
    Serial.println(location);

    if (Firebase.set(firebaseData, path, json)) {
        Serial.println("[SUCCESS] Equipment created (auto-named).");
    } else {
        Serial.print("[ERROR] Firebase equipment create failed: ");
        Serial.println(firebaseData.errorReason());
    }
}

/**
 * @brief Checks if a new card is present on the reader and returns true.
 * If true, the reader.uid will be populated and can be used.
 */
bool scanReaderPresent(MFRC522& rfid) {
  if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
    rfid.PICC_HaltA(); // halt after read
    return true;
  }
  return false;
}

// -----------------------------------------------------------------
//                               SETUP
// -----------------------------------------------------------------

void setup() {
    Serial.begin(115200);
    SPI.begin();
    
    // Initialize all readers
    reader1.PCD_Init();
    reader2.PCD_Init();
    reader3.PCD_Init();

    Serial.println("--- Equipment Tracker Initialized ---");
    connectWiFi();

    // Initialize Firebase
    config.database_url = FIREBASE_HOST;
    config.signer.tokens.legacy_token = FIREBASE_AUTH;
    Firebase.begin(&config, &auth);
    Firebase.reconnectWiFi(true);

    // Increase read timeout for slower networks if needed
    Firebase.setReadTimeout(firebaseData, 1000 * 60); // 60s

    Serial.println("Ready to scan [TARGET]");
    Serial.println("------------------------------------------");
}

// -----------------------------------------------------------------
//                                LOOP
// -----------------------------------------------------------------

void loop() {

    // 1) Check each reader for a present card (prefer Reader1 priority)
    bool r1 = scanReaderPresent(reader1);
    bool r2 = false;
    bool r3 = false;

    // Only check reader2/3 if reader1 didn't detect — keeps priority
    if (!r1) {
        r2 = scanReaderPresent(reader2);
    }
    if (!r1 && !r2) {
        r3 = scanReaderPresent(reader3);
    }

    if (!r1 && !r2 && !r3) {
        // nothing found
        delay(200);
        return;
    }

    MFRC522::Uid currentUid;
    String location = "";
    int readerId = 0;

    if (r1) {
        currentUid = reader1.uid;
        location = "Equipment Area";
        readerId = 1;
    } else if (r2) {
        currentUid = reader2.uid;
        location = "Dumbbell Space";
        readerId = 2;
    } else if (r3) {
        currentUid = reader3.uid;
        location = "Free Area";
        readerId = 3;
    }

    String tagId = getTagId(currentUid);
    Serial.println("------------------------------------------");
    Serial.print("[SCAN] Detected Tag: ");
    Serial.print(tagId);
    Serial.print(" on Reader ");
    Serial.println(readerId);

    // 2) CHECK /equipment/<tagId> FIRST
    String equipmentPath = "/equipment/" + tagId;
    if (pathExists(equipmentPath)) {
        // Equipment exists: update location only
        Serial.println("[ACTION] Tag exists in /equipment. Updating location only.");
        updateEquipmentLocation(tagId, location);
    } else {
        // Not in equipment: check /pending_items/<tagId>
        String pendingPath = "/pending_items/" + tagId;
        if (pathExists(pendingPath)) {
            // Pending exists: do nothing (staff will assign name & move)
            Serial.println("[ACTION] Tag found in /pending_items. Waiting for staff to assign name. No change.");
            // (Optionally, you can log last_seen timestamp in pending — but per requirements we keep it untouched)
        } else {
            // Tag not found anywhere: create new entry
            if (readerId == 2) {
                // Reader 2 auto-assign to Dumbbell (per your choice A)
                Serial.println("[ACTION] New tag on Reader 2 -> Auto-create equipment as 'Dumbbell'");
                createEquipmentWithName(tagId, "Dumbbell", location);
            } else if (readerId == 3) {
                // Reader 3 auto-assign to Other Equipment
                Serial.println("[ACTION] New tag on Reader 3 -> Auto-create equipment as 'Other Equipment'");
                createEquipmentWithName(tagId, "Other Equipment", location);
            } else {
                // Reader 1 (EQUIPMENT Area) or unknown reader: create pending item
                Serial.println("[ACTION] New tag on Reader 1 -> Creating pending_items entry for staff naming.");
                createPendingItem(tagId, location);
            }
        }
    }

    Serial.println("------------------------------------------");
    delay(1000); // small cooldown to avoid duplicates
}
