#include <SPI.h>
#include <MFRC522.h>

// --- PIN DEFINITIONS ---
#define RST_PIN_1   D3  // Reader 1 RST (Docking)
#define SS_PIN_1    D8  // Reader 1 SDA/SS
#define RST_PIN_2   D4  // Reader 2 RST (Free Space)
#define SS_PIN_2    D2  // Reader 2 SDA/SS

// --- TARGET TAG ID (Yoga Mat ID) ---
const byte YOGA_MAT_UID[] = {0x16, 0x2E, 0xAA, 0x04};
const byte YOGA_MAT_UID_SIZE = sizeof(YOGA_MAT_UID);

// --- GLOBAL STATE MANAGEMENT ---
enum MatState {
    // Initial State/Returned State
    STATE_AVAILABLE_DOCKED,  
    // After R1 Scan (Taken)
    STATE_IN_USE_TAKEN,      
    // After R2 Scan (In Free Space)
    STATE_IN_USE_FREE_SPACE  
};

// Initial state: Assumed to be available in the general equipment area
MatState currentMatState = STATE_AVAILABLE_DOCKED; 

// Create two MFRC522 instances
MFRC522 reader1(SS_PIN_1, RST_PIN_1); 
MFRC522 reader2(SS_PIN_2, RST_PIN_2);

void setup() {
  Serial.begin(115200);
  SPI.begin();
  
  reader1.PCD_Init();
  reader2.PCD_Init();

  Serial.println("--- Dynamic Yoga Mat Tracker Initialized ---");
  Serial.println("R1: Docking Station | R2: Free Space Area");
  Serial.println("------------------------------------------");
}

void loop() {
  // Check readers for the target tag
  bool matFoundR1 = checkReader(reader1);
  bool matFoundR2 = checkReader(reader2);
  
  // --- STATE TRANSITION LOGIC ---
  
  if (matFoundR1) {
    // Mat Scanned at Reader 1 (Docking Station)
    
    if (currentMatState == STATE_AVAILABLE_DOCKED) {
      // 1. Mat is available, now scanned -> IT IS TAKEN
      currentMatState = STATE_IN_USE_TAKEN;
      Serial.println("🧘‍♀️ **Yoga mat is IN USE** (Just taken from docking station).");
      
    } else if (currentMatState == STATE_IN_USE_TAKEN || currentMatState == STATE_IN_USE_FREE_SPACE) {
      // 3. Mat was taken/in free space, now scanned -> IT IS RETURNED
      currentMatState = STATE_AVAILABLE_DOCKED;
      Serial.println("✅ **Yoga mat returned and it is FREE TO USE!**");
    }
    
  } else if (matFoundR2) {
    // Mat Scanned at Reader 2 (Free Space Area)
    
    if (currentMatState == STATE_IN_USE_TAKEN) {
      // 2. Mat was taken, now scanned at free space -> NEW LOCATION CONFIRMED
      currentMatState = STATE_IN_USE_FREE_SPACE;
      Serial.println("⚠️ **Staff: See the location - FREE SPACE** (Mat is in activity area).");
    } 
    // If mat is scanned at R2 while already in STATE_IN_USE_FREE_SPACE, we do nothing to prevent spam.
  }

  // --- DISPLAY LOGIC (Only runs if no scan occurred this loop) ---
  if (!matFoundR1 && !matFoundR2) {
    Serial.print("Current Status: ");
    switch (currentMatState) {
        case STATE_AVAILABLE_DOCKED:
            // Display for the initial state and the final returned state
            Serial.println("🧘‍♀️ Yoga mat is in location *EQUIPMENT'S* (FREE).");
            break;
            
        case STATE_IN_USE_TAKEN:
            // Mat was taken but hasn't reached R2 yet, or is being used away from both.
            Serial.println("🧘‍♀️ Yoga mat is IN USE (Away from readers).");
            break;
            
        case STATE_IN_USE_FREE_SPACE:
            // Mat was last seen at R2. Keep displaying the staff message until it is scanned at R1.
            Serial.println("⚠️ **Staff: See the location - FREE SPACE** (Persisting status).");
            break;
    }
  }

  Serial.println("------------------------------------------");
  delay(1000); 
}


// Function to compare the currently scanned tag UID with the target UID
bool compareTag(MFRC522::Uid currentUID) {
  if (currentUID.size != YOGA_MAT_UID_SIZE) return false;
  
  for (byte i = 0; i < currentUID.size; i++) {
    if (currentUID.uidByte[i] != YOGA_MAT_UID[i]) return false;
  }
  return true; 
}


// Function to check a single reader and return TRUE if the Yoga Mat is found
bool checkReader(MFRC522& rfid) {
  if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
    
    // Check if the scanned tag is the Yoga Mat
    if (compareTag(rfid.uid)) {
      rfid.PICC_HaltA(); // Halt the card
      return true;
    }
    
    // Halt any other tag that was read
    rfid.PICC_HaltA();
  }
  return false;
}