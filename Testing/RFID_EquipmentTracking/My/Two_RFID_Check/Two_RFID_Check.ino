#include <SPI.h>
#include <MFRC522.h>

// --- PIN DEFINITIONS FOR READER 1 ---
#define RST_PIN_1   D3  // Reader 1 RST (GPIO0)
#define SS_PIN_1    D8  // Reader 1 SDA/SS (GPIO15)

// --- PIN DEFINITIONS FOR READER 2 ---
#define RST_PIN_2   D4  // Reader 2 RST (GPIO2)
#define SS_PIN_2    D2  // Reader 2 SDA/SS (GPIO4)

// Create two MFRC522 instances
MFRC522 reader1(SS_PIN_1, RST_PIN_1); 
MFRC522 reader2(SS_PIN_2, RST_PIN_2);

void setup() {
  Serial.begin(115200);   // Start serial communication
  SPI.begin();            // Init the shared SPI bus

  // Initialize both readers
  reader1.PCD_Init();
  reader2.PCD_Init();

  Serial.println("--- Dual RFID Reader Setup ---");
  Serial.print("Reader 1: ");
  // Check initialization for Reader 1
  if (reader1.PCD_ReadRegister(reader1.VersionReg) != 0x00) {
      Serial.println("OK");
  } else {
      Serial.println("Error");
  }

  Serial.print("Reader 2: ");
  // Check initialization for Reader 2
  if (reader2.PCD_ReadRegister(reader2.VersionReg) != 0x00) {
      Serial.println("OK");
  } else {
      Serial.println("Error");
  }
  Serial.println("----------------------------");
  Serial.println("Hold a tag near either reader...");
}

void loop() {
  // 1. Check Reader 1
  readTag(reader1, "Reader 1");

  // 2. Check Reader 2
  readTag(reader2, "Reader 2");

  delay(50); // Small delay to prevent too much load on the loop
}


// Function to handle tag reading and printing for any given reader
void readTag(MFRC522& rfid, const char* readerName) {
  // Look for new cards
  if (rfid.PICC_IsNewCardPresent()) {
    
    // Select one of the cards
    if (rfid.PICC_ReadCardSerial()) {
      Serial.print(readerName);
      Serial.print(" :- Tag ID: ");
      
      // Print the UID (Tag ID)
      for (byte i = 0; i < rfid.uid.size; i++) {
        if(rfid.uid.uidByte[i] < 0x10) {
          Serial.print("0");
        }
        Serial.print(rfid.uid.uidByte[i], HEX);
        Serial.print(" ");
      } 
      Serial.println();
      
      // Halt the card to allow other readers to work
      rfid.PICC_HaltA();
    }
  }
}