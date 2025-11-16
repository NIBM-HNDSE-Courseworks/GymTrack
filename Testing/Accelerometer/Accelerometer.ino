// This sketch is for the ESP8266 (NodeMCU V3) and focuses ONLY on the MPU-6050 Rep Counting.
// It uses the core State Transition Logic (FREE <-> IN USE <-> IDLE) driven by motion detection.

// *******************************************************************
// REQUIRED LIBRARIES:
// 1. Install the "Adafruit MPU6050" library.
// 2. Ensure the "ESP8266" board package is installed.
// *******************************************************************

#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

// --- PIN DEFINITIONS ---
// I2C Pin Definitions for ESP8266 (NodeMCU)
#define I2C_SDA_PIN D2 // GPIO 4 (NodeMCU Pin D2)
#define I2C_SCL_PIN D1 // GPIO 5 (NodeMCU Pin D1)

// --- STATE VARIABLES ---
enum EquipmentState {
    FREE,
    IN_USE,
    IDLE,
    MAINTENANCE
};
EquipmentState currentStatus = FREE;

// MPU-6050 Object
Adafruit_MPU6050 mpu;

// --- REP COUNTING LOGIC ---
int repsCurrentSession = 0;
// Threshold: Adjust this value in the simulation to trigger a rep count.
const float REP_THRESHOLD_G = 0.5; 
bool currently_down = false;       
long lastMotionTime = 0;           // Timestamp of the last detected rep

// --- STATE TRANSITION TIMERS (from Project Spec) ---
// Note: These timers are long, consider reducing them (e.g., 5s, 10s) for faster simulation testing.
const long IN_USE_TO_IDLE_TIMEOUT_MS = 1000; // 120 seconds
const long IDLE_TO_FREE_TIMEOUT_MS = 300;  // 300 seconds (5 minutes)

// --- Helper function to convert state enum to string ---
String getStateString(EquipmentState s) {
  switch (s) {
    case FREE: return "FREE";
    case IN_USE: return "IN USE";
    case IDLE: return "IDLE";
    case MAINTENANCE: return "MAINTENANCE";
    default: return "UNKNOWN";
  }
}

void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println("Smart Gym Tracker - MPU-6050 Only Setup");
  
  // Initialize I2C and MPU-6050
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  if (!mpu.begin()) {
    Serial.println("FATAL: Failed to find MPU-6050. Check I2C address and connections.");
    while (1) delay(10);
  }
  mpu.setAccelerometerRange(MPU6050_RANGE_2_G);
  
  Serial.println("MPU-6050 Initialized. Starting tracking loop...");
}

void loop() {
  long currentTime = millis();
  bool rep_detected = false;
  
  // --- 1. READ MPU-6050 ---
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);
  float accelY_G = a.acceleration.y / 9.80665; // Convert m/s^2 to G's (Y-axis for up/down)
  
  Serial.print("Y-Axis Acceleration (G): ");
  Serial.println(accelY_G, 2);

  // --- 2. REP COUNTING LOGIC ---
  
  if (accelY_G > REP_THRESHOLD_G) { // Peak 1: Movement down
    currently_down = true;
  } 
  else if (accelY_G < -REP_THRESHOLD_G && currently_down) { // Peak 2: Movement up (Completion)
    repsCurrentSession++;
    currently_down = false;
    lastMotionTime = currentTime; 
    rep_detected = true;
    Serial.print("--- REP COUNTED! Total: ");
    Serial.println(repsCurrentSession);
  }
  
  // --- 3. CORE STATE TRANSITION LOGIC ---
  EquipmentState previousStatus = currentStatus;

  switch (currentStatus) {
    case FREE:
      // FREE -> IN USE: If Reps > 0 detected.
      if (repsCurrentSession > 0) { 
        currentStatus = IN_USE;
      }
      break;

    case IN_USE:
      // IN USE -> IDLE: If Reps = 0 for 120 seconds
      if (currentTime - lastMotionTime >= IN_USE_TO_IDLE_TIMEOUT_MS) {
        currentStatus = IDLE;
        repsCurrentSession = 0; // Reset rep count
        lastMotionTime = currentTime; // Start IDLE timer
      }
      break;

    case IDLE:
      // IDLE -> IN USE: If motion resumes.
      if (rep_detected) { 
        currentStatus = IN_USE;
        lastMotionTime = currentTime; 
      }
      // IDLE -> FREE: If remains IDLE for 300 seconds
      else if (currentTime - lastMotionTime >= IDLE_TO_FREE_TIMEOUT_MS) {
        currentStatus = FREE;
      }
      break;

    case MAINTENANCE:
      // MAINTENANCE state is manual and does not change here.
      break;
  }
  
  // Print status change to Serial Monitor
  if (previousStatus != currentStatus) {
    Serial.print(">>> STATUS CHANGE: ");
    Serial.print(getStateString(previousStatus));
    Serial.print(" -> ");
    Serial.println(getStateString(currentStatus));
  }
  
  delay(100); // Read sensor data every 100ms
}