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
#define RST_PIN_1   D3  // Reader 1: Docking Station
#define SS_PIN_1    D8
#define RST_PIN_2   D4  // Reader 2: Free Space
#define SS_PIN_2    D2
#define RST_PIN_3   D0  // Reader 3: Dumbbell Area
#define SS_PIN_3    D1

// --- TARGET TAG IDs ---
const byte YOGA_MAT_UID[] = {0x16, 0x2E, 0xAA, 0x04};
const byte YOGA_MAT_UID_SIZE = sizeof(YOGA_MAT_UID);
const byte DUMBBELL_UID[] = {0x34, 0x3E, 0x99, 0x04};
const byte DUMBBELL_UID_SIZE = sizeof(DUMBBELL_UID);

// Create three MFRC522 instances
MFRC522 reader1(SS_PIN_1, RST_PIN_1);
MFRC522 reader2(SS_PIN_2, RST_PIN_2);
MFRC522 reader3(SS_PIN_3, RST_PIN_3);

// --- EQUIPMENT LOCKING STRUCTURES ---

// Maximum number of unique tags we will track and lock the name for
#define MAX_EQUIPMENT_COUNT 10 

struct EquipmentAssignment {
    String tagId;
    String equipmentName; // This is the CONST value after first scan
};

// Global array to store the permanent assignments
EquipmentAssignment equipmentRegistry[MAX_EQUIPMENT_COUNT];
int registryCount = 0; // Current number of stored assignments

// -----------------------------------------------------------------
//                          HELPER FUNCTIONS
// -----------------------------------------------------------------

/**
 * @brief Converts a byte array (UID) into a capitalized hex string.
 */
String getTagId(MFRC522::Uid currentUID) {
  String cardID = "";
  for (byte i = 0; i < currentUID.size; i++) {
    if (currentUID.uidByte[i] < 0x10) cardID += "0";
    cardID += String(currentUID.uidByte[i], HEX);
  }
  cardID.toUpperCase();
  return cardID;
}

/**
 * @brief Searches the registry for the given Tag ID.
 * @return The assigned equipment name, or an empty string if not found.
 */
String findEquipmentName(String tagId) {
    for (int i = 0; i < registryCount; i++) {
        if (equipmentRegistry[i].tagId.equals(tagId)) {
            return equipmentRegistry[i].equipmentName;
        }
    }
    return ""; // Not found
}

/**
 * @brief Assigns and locks the equipment name for a new Tag ID.
 * @param tagId The hex string of the scanned RFID tag.
 * @param readerId The ID of the reader that scanned it first (1, 2, or 3).
 * @return The assigned equipment name, or "UNKNOWN" if registry is full.
 */
String assignEquipmentName(String tagId, int readerId) {
    if (registryCount >= MAX_EQUIPMENT_COUNT) {
        Serial.println("🛑 ERROR: Equipment registry is full!");
        return "UNKNOWN";
    }

    // Determine name based on first reader scanned, as per requirement
    String name;
    if (readerId == 1) {
        name = "Yoga Mat";
    } else if (readerId == 2) {
        name = "Dumbbell";
    } else {
        name = "Other Equipment";
    }

    // Lock the assignment
    equipmentRegistry[registryCount].tagId = tagId;
    equipmentRegistry[registryCount].equipmentName = name;
    registryCount++;

    Serial.print("🔒 ID Lock: Tag "); Serial.print(tagId);
    Serial.print(" permanently assigned as: "); Serial.println(name);

    return name;
}


/**
 * @brief Compares the currently scanned tag UID with a target UID. (Kept for scanReader)
 */
bool compareTag(MFRC522::Uid currentUID, const byte* targetUID, const byte targetSize) {
  if (currentUID.size != targetSize) return false;
  for (byte i = 0; i < currentUID.size; i++) {
    if (currentUID.uidByte[i] != targetUID[i]) return false;
  }
  return true;
}

/**
 * @brief Checks if a new card is present on the reader and returns its UID bytes.
 * NOTE: This is slightly simplified since the name determination is now in loop().
 */
const byte* scanReader(MFRC522& rfid) {
  if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
    // Halt the PICC and return the UID so the main loop can process it
    rfid.PICC_HaltA();
    return rfid.uid.uidByte; // Return the start of the UID array
  }
  return nullptr; // Indicates nothing found
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
 * @brief Updates the equipment status in Firebase.
 * @param tagId The hex string of the scanned RFID tag.
 * @param location The physical location (e.g., "Docking Station").
 * @param name The equipment name (LOCKED value).
 */
void updateFirebaseEquipment(String tagId, String location, String name) {
  // Path for the equipment: "equipment/TAG_ID"
  String path = "/equipment/" + tagId;

  // Create JSON payload
  FirebaseJson json;
  json.set("rfid_tag", tagId);
  json.set("location", location);
  json.set("name", name); // This name is now locked/constant
  json.set("timestamp", (int)millis());

  Serial.print("📡 Pushing update for "); Serial.print(name); Serial.print(" to: "); Serial.println(path);
  
  if (Firebase.set(firebaseData, path, json)) {
    Serial.println("✅ Firebase update success (Location updated).");
  } else {
    Serial.print("🛑 Firebase update failed: ");
    Serial.println(firebaseData.errorReason());
  }
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

    Serial.println("Ready to scan 🎯");
    Serial.println("------------------------------------------");
}

// -----------------------------------------------------------------
//                               LOOP
// -----------------------------------------------------------------

void loop() {
    
    // ------------------------------------------------
    // 1. SCAN ALL READERS
    // ------------------------------------------------
    const byte* foundR1 = scanReader(reader1);
    const byte* foundR2 = scanReader(reader2);
    const byte* foundR3 = scanReader(reader3);
    
    String tagId = "";
    String equipmentName = "";
    String location = "";
    MFRC522::Uid currentUid;
    int readerId = 0; // Used to track which reader found the tag

    // ------------------------------------------------
    // 2. DETERMINE WHICH READER FOUND A TAG
    // ------------------------------------------------
    
    if (foundR1 != nullptr) {
        currentUid = reader1.uid;
        location = "EQUIPMENT Area";
        readerId = 1;
    } 
    else if (foundR2 != nullptr) {
        currentUid = reader2.uid;
        location = "Dumbbell Space";
        readerId = 2;
    } 
    else if (foundR3 != nullptr) {
        currentUid = reader3.uid;
        location = "Free Area";
        readerId = 3;
    }
    
    // ------------------------------------------------
    // 3. PROCESS SCANNED TAG (Lock/Lookup Name & Update Firebase)
    // ------------------------------------------------

    if (readerId != 0) {
        tagId = getTagId(currentUid);
        
        // 3a. Check if the name is already locked in the registry
        equipmentName = findEquipmentName(tagId);

        if (equipmentName.isEmpty()) {
            // 3b. Name is NOT locked, assign and lock it based on the READER ID
            equipmentName = assignEquipmentName(tagId, readerId);
        } else {
            // 3c. Name IS locked, proceed with the existing name
            Serial.print("Lookup: Tag "); Serial.print(tagId); 
            Serial.print(" is a locked: "); Serial.println(equipmentName);
        }

        // 3d. Update Firebase (ONLY location changes, name is constant)
        if (equipmentName != "UNKNOWN") {
            updateFirebaseEquipment(tagId, location, equipmentName);
        }
    }


    Serial.println("------------------------------------------");
    delay(1000); 
}