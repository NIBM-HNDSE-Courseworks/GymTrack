#include <SPI.h>
#include <MFRC522.h>

// --- PIN DEFINITIONS ---
#define RST_PIN_1   D3  // Reader 1 RST (GPIO0)
#define SS_PIN_1    D8  // Reader 1 SDA/SS (GPIO15)
#define RST_PIN_2   D4  // Reader 2 RST (GPIO2)
#define SS_PIN_2    D2  // Reader 2 SDA/SS (GPIO4)

// --- TARGET TAG ID ---
// The tag ID to look for: 2A D8 95 04
// MFRC522 stores this as an array of bytes.
const byte TARGET_TAG_UID[] = {0x2A, 0xD8, 0x95, 0x04};
const byte TARGET_TAG_SIZE = sizeof(TARGET_TAG_UID);

// Create two MFRC522 instances
MFRC522 reader1(SS_PIN_1, RST_PIN_1); 
MFRC522 reader2(SS_PIN_2, RST_PIN_2);

void setup() {
  Serial.begin(115200);
  SPI.begin();
  
  reader1.PCD_Init();
  reader2.PCD_Init();

  Serial.println("--- Dual RFID Reader Setup ---");
  // ... (Initialization check code remains the same) ...
  Serial.print("Reader 1: ");
  if (reader1.PCD_ReadRegister(reader1.VersionReg) != 0x00) {
      Serial.println("OK");
  } else {
      Serial.println("Error");
  }
  Serial.print("Reader 2: ");
  if (reader2.PCD_ReadRegister(reader2.VersionReg) != 0x00) {
      Serial.println("OK");
  } else {
      Serial.println("Error");
  }
  Serial.println("----------------------------");
  Serial.println("Looking for Target Tag: 2A D8 95 04");
}

void loop() {
  readTag(reader1, "Reader 1");
  readTag(reader2, "Reader 2");
  delay(50);
}

// Function to compare the currently scanned tag UID with the target UID
bool compareTag(MFRC522::Uid currentUID) {
  // 1. Check if sizes match
  if (currentUID.size != TARGET_TAG_SIZE) {
    return false;
  }
  
  // 2. Check if all bytes match
  for (byte i = 0; i < currentUID.size; i++) {
    if (currentUID.uidByte[i] != TARGET_TAG_UID[i]) {
      return false; // Mismatch found
    }
  }
  
  return true; // All bytes matched
}


// Function to handle tag reading and checking for the specific tag
void readTag(MFRC522& rfid, const char* readerName) {
  if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
    
    Serial.print(readerName);
    Serial.print(" :- Scanned ID: ");
    
    // Convert scanned UID to a string for printing (optional but helpful)
    String scannedID = "";
    for (byte i = 0; i < rfid.uid.size; i++) {
      if(rfid.uid.uidByte[i] < 0x10) {
        scannedID += "0";
      }
      scannedID += String(rfid.uid.uidByte[i], HEX);
      scannedID += " ";
    }
    scannedID.toUpperCase(); // Display in uppercase
    Serial.println(scannedID);

    // --- Check if the scanned tag matches the TARGET_TAG_UID ---
    if (compareTag(rfid.uid)) {
      Serial.println(" (Target Tag Found) <<<<");
      // You can add an action here, like turning on an LED or opening a lock
    } else {
      Serial.println("---- ACCESS DENIED (Unknown Tag) ----");
    }

    // Halt the card
    rfid.PICC_HaltA();
  }
}