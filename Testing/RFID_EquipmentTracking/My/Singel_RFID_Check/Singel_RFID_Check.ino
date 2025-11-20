#include <SPI.h>
#include <MFRC522.h>

// Define the pins connected to the RC522
#define RST_PIN   D3  // Connects to RC522 RST (GPIO0)
#define SS_PIN    D8  // Connects to RC522 SDA/SS (GPIO15)

MFRC522 mfrc522(SS_PIN, RST_PIN); // Create MFRC522 instance

void setup() {
  Serial.begin(115200);   // Start serial communication
  SPI.begin();            // Init SPI bus
  mfrc522.PCD_Init();     // Init MFRC522

  // Check if the reader initialized correctly
  if (mfrc522.PCD_ReadRegister(mfrc522.VersionReg) == 0x00) {
    Serial.println(" **ERROR: RC522 reader failed to initialize.** Check wiring and power.");
  } else {
    Serial.println("---");
    Serial.println(" **RC522 reader is working!**");
    Serial.println("---");
    Serial.println("Hold a tag near the reader...");
  }
}

void loop() {
  // Look for new cards
  if ( ! mfrc522.PICC_IsNewCardPresent()) {
    return; // No card found, exit loop
  }

  // Select one of the cards
  if ( ! mfrc522.PICC_ReadCardSerial()) {
    return; // Card found, but failed to read ID
  }

  // Print the Tag ID (UID) to Serial Monitor
  Serial.print("Tag ID (UID) found: ");
  
  // The UID is stored in a 4-byte array (mfrc522.uid.uidByte)
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    // Print each byte as a two-digit hexadecimal number
    if(mfrc522.uid.uidByte[i] < 0x10) {
      Serial.print("0");
    }
    Serial.print(mfrc522.uid.uidByte[i], HEX);
    Serial.print(" ");
  } 
  Serial.println();
  
  // Stop communication with the card
  mfrc522.PICC_HaltA();
}