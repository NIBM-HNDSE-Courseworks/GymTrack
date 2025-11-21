#include <SPI.h>
#include <MFRC522.h>

// --- PIN DEFINITIONS ---
#define RST_PIN_1   D3  // Reader 1: Docking Station
#define SS_PIN_1    D8
#define RST_PIN_2   D4  // Reader 2: Free Space
#define SS_PIN_2    D2
#define RST_PIN_3   D0  // Reader 3: Dumbbell Area
#define SS_PIN_3    D1

// --- TARGET TAG IDs (MOVED HERE TO FIX SCOPE ERROR) ---
const byte YOGA_MAT_UID[] = {0x16, 0x2E, 0xAA, 0x04};
const byte YOGA_MAT_UID_SIZE = sizeof(YOGA_MAT_UID);
const byte DUMBBELL_UID[] = {0x34, 0x3E, 0x99, 0x04};
const byte DUMBBELL_UID_SIZE = sizeof(DUMBBELL_UID);

// --- GLOBAL STATE MANAGEMENT (For Yoga Mat only) ---
enum MatState {
    STATE_AVAILABLE_DOCKED,
    STATE_IN_USE_TAKEN,
    STATE_IN_USE_FREE_SPACE,
    STATE_IN_USE_DUMBBELL_AREA
};

MatState currentMatState = STATE_AVAILABLE_DOCKED;

// Create three MFRC522 instances
MFRC522 reader1(SS_PIN_1, RST_PIN_1);
MFRC522 reader2(SS_PIN_2, RST_PIN_2);
MFRC522 reader3(SS_PIN_3, RST_PIN_3);

// Function to compare the currently scanned tag UID with a target UID
bool compareTag(MFRC522::Uid currentUID, const byte* targetUID, const byte targetSize) {
    if (currentUID.size != targetSize) return false;

    for (byte i = 0; i < currentUID.size; i++) {
        if (currentUID.uidByte[i] != targetUID[i]) return false;
    }
    return true;
}

// --- ACTIVE SCAN FUNCTION (NOW CORRECTLY SCOPED) ---
const byte* scanReader(MFRC522& rfid) {
    // Only proceed if a new card is present and its serial is read
    if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
        
        // 1. Check if it's the YOGA MAT
        if (compareTag(rfid.uid, YOGA_MAT_UID, YOGA_MAT_UID_SIZE)) {
            rfid.PICC_HaltA();
            return YOGA_MAT_UID;
        }

        // 2. Check if it's the DUMBBELL
        if (compareTag(rfid.uid, DUMBBELL_UID, DUMBBELL_UID_SIZE)) {
            rfid.PICC_HaltA();
            return DUMBBELL_UID;
        }
        
        // If it's another tag (unknown), halt it and return NULL
        rfid.PICC_HaltA();
    }
    return nullptr; // Indicates nothing found or an unknown tag was read and halted
}

void setup() {
    Serial.begin(115200);
    SPI.begin();

    reader1.PCD_Init();
    reader2.PCD_Init();
    reader3.PCD_Init();

    Serial.println("--- Dual Asset Tracker Initialized ---");
    Serial.println("R1: Docking | R2: Free Space | R3: Dumbbell Area");
    Serial.println("------------------------------------------");
    
    // R3 DIAGNOSTIC CHECK (re-added for debugging R3 issue)
    byte versionR3 = reader3.PCD_ReadRegister(MFRC522::VersionReg);
    Serial.print("R3 Version Register (Expect > 0x00): 0x");
    Serial.println(versionR3, HEX);
    if (versionR3 == 0x00 || versionR3 == 0xFF) {
        Serial.println("🛑 R3 ERROR: Communication or RST pin failure. Check D0/GPIO16 wiring.");
    } else {
        Serial.println("✅ R3 initialized successfully.");
    }
    Serial.println("------------------------------------------");
}

void loop() {
    
    // ------------------------------------------------
    // 1. SCAN ALL READERS (Single Pass)
    // ------------------------------------------------
    const byte* foundR1 = scanReader(reader1);
    const byte* foundR2 = scanReader(reader2);
    const byte* foundR3 = scanReader(reader3);
    
    bool matScanned = false;

    // ------------------------------------------------
    // 2. PROCESS RESULTS (State Transitions & Instantaneous Messages)
    // ------------------------------------------------
    
    // --- READER 1 (DOCKING) ---
    if (foundR1 == YOGA_MAT_UID) {
        if (currentMatState == STATE_AVAILABLE_DOCKED) {
            currentMatState = STATE_IN_USE_TAKEN;
            Serial.println("🧘‍♀️ **Yoga mat is IN USE** (Just taken from docking station).");
        } else {
            currentMatState = STATE_AVAILABLE_DOCKED;
            Serial.println("✅ **Yoga mat returned and it is FREE TO USE!**");
        }
        matScanned = true;
    } 

    // --- READER 2 (FREE SPACE) ---
    if (foundR2 == YOGA_MAT_UID) {
        if (currentMatState != STATE_IN_USE_FREE_SPACE) {
            currentMatState = STATE_IN_USE_FREE_SPACE;
            Serial.println("⚠️ **Staff: See the location - FREE SPACE** (Mat is in activity area).");
        }
        matScanned = true;
    } else if (foundR2 == DUMBBELL_UID) {
        Serial.println("💪 **Dumbbell is in the area: FREE SPACE**");
    }

    // --- READER 3 (DUMBBELL AREA) ---
    if (foundR3 == YOGA_MAT_UID) { 
        if (currentMatState != STATE_IN_USE_DUMBBELL_AREA) {
            currentMatState = STATE_IN_USE_DUMBBELL_AREA;
            Serial.println("🏋️ **Staff: See the location - DUMBBELL AREA** (Mat is in that zone).");
        }
        matScanned = true;
    } else if (foundR3 == DUMBBELL_UID) { 
        Serial.println("💪 **Dumbbell is in the area: DUMBBELL AREA**");
    }
    
    // ------------------------------------------------
    // 3. DISPLAY YOGA MAT PERSISTING STATUS
    // ------------------------------------------------
    
    if (!matScanned) {
        Serial.print("Current Yoga Mat Status: ");
        switch (currentMatState) {
            case STATE_AVAILABLE_DOCKED:
                Serial.println("🧘‍♀️ Yoga mat is in location *EQUIPMENT'S* (FREE).");
                break;
            case STATE_IN_USE_TAKEN:
                Serial.println("🧘‍♀️ Yoga mat is IN USE (Away from readers, location unknown).");
                break;
            case STATE_IN_USE_FREE_SPACE:
                Serial.println("⚠️ **Staff: See the location - FREE SPACE** (Persisting status).");
                break;
            case STATE_IN_USE_DUMBBELL_AREA:
                Serial.println("🏋️ **Staff: See the location - DUMBBELL AREA** (Persisting status).");
                break;
        }
    }

    Serial.println("------------------------------------------");
    delay(1000); 
}