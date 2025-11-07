# 🏋️‍♂️ GymTrack: Enhanced Smart Gym Equipment Tracker  
### IoT Coursework Project

---

## 1. Project Overview
**GymTrack** is an Internet of Things (IoT) solution designed to monitor gym equipment usage in real-time.  
By leveraging various sensors connected via an **ESP32 microcontroller**, the system provides immediate feedback to customers regarding machine availability and generates insightful usage analytics for gym staff.

**Primary goals:**
- Accurately track the state of high-value gym equipment (**FREE, IN USE, IDLE, MAINTENANCE**).  
- Count repetitions and measure presence for real-time customer utility.  
- Provide data for long-term facility analysis (e.g., peak hours, machine hogging, maintenance scheduling).  
- Track gym accessories (e.g., dumbbells, mats, resistance bands) using **RFID tags** for loss prevention and equipment management.

---

## 2. Hardware and Sensor Summary
The system utilizes a central **ESP32 microcontroller** for data acquisition, processing raw sensor inputs into meaningful equipment status before transmission.

| Equipment Type | Primary Sensor | Detection Mechanism | Data Output |
|----------------|----------------|---------------------|--------------|
| Rep-Counting Machine (e.g., Lat Pulldown) | MPU-6050 Accelerometer | Detects up/down motion (Y-axis change) to count reps. | Reps/minute, Motion detected (Boolean) |
| Seated Equipment (e.g., Bench Press) | IR Proximity Sensor | Detects an object (person) within immediate proximity of the seat. | Presence detected (Boolean) |
| High-Traffic Area (e.g., Squat Rack) | Ultrasonic Sensor (HC-SR04) | Detects an object (person) standing within the defined usage zone. | Distance (cm), Presence detected (Boolean) |
| Dumbbell Rack Slot (e.g., 20kg Dumbbell) | Force Sensitive Resistor (FSR) | Measures pressure to confirm if the dumbbell is present or removed. | Weight (kg), Dumbbell present (Boolean) |
| Gym Accessories (e.g., Mats, Dumbbells, Belts) | **RFID Tag + Reader (RC522 Module)** | Each item is tagged with a unique RFID chip; reader detects tag presence for real-time inventory and usage tracking. | Item ID, Presence (Boolean), Last Scan Time |
| Electric Equipment (e.g., Treadmill, Elliptical) | **ACS712 Current Sensor** | Measures current draw from the power line to detect when the machine is operating. | Current (A), Power ON/OFF (Boolean) |
| Microcontroller | ESP32 (Wi-Fi Enabled) | Reads sensor data, applies initial logic, and sends data to the cloud API. | JSON payload via MQTT/HTTP |

---

## 3. Core Tracking Logic & Data States
The tracking function on the **ESP32** determines the current equipment status based on sensor readings and configured time windows.

### A. Core Data States
All monitored equipment reports one of the following four critical states:

| State | Definition | Audience |
|--------|-------------|-----------|
| **FREE** | Ready for immediate use. | Customer/Staff |
| **IN USE** | Currently being operated by a member. | Customer/Staff |
| **IDLE** | Recently used (e.g., past 2 minutes) but currently empty. (Helps prevent machine “hogging”). | Staff/Analysis |
| **MAINTENANCE** | Out of service due to technical issues or cleaning (set manually by staff). | Customer/Staff |

---

### B. State Transition Example (Lat Pulldown)
The state transitions are governed by logic implemented in the **ESP32 firmware**.

---

**MPU-6050 (Rep Counting) Logic**  
- **FREE → IN USE:** If Reps > 0 detected within a 5-second window  
- **IN USE → IDLE:** If Reps = 0 for 120 seconds  
- **IDLE → FREE:** If state remains IDLE for 300 seconds (5 minutes)

---

**IR / Ultrasonic (Presence) Logic**  
- **FREE → IN USE:** If Presence = True for 10 consecutive seconds  
- **IN USE → FREE:** If Presence = False for 5 consecutive seconds  

---

**RFID Tracking Logic (Inventory & Movement Detection)**  
- **ITEM PRESENT → ITEM REMOVED:** If RFID tag not detected within defined range (reader timeout = 3 seconds)  
- **ITEM REMOVED → ITEM PRESENT:** When RFID tag is re-detected on the rack  
- **LOST/UNREGISTERED:** If item remains undetected beyond 24 hours  
- Each RFID event logs **timestamp**, **item ID**, and **reader location** for asset management.

---

**Current Sensor Logic (Electrical Equipment Usage)**  
- **FREE → IN USE:** If measured current > 0.5A for at least 3 seconds (indicates motor activity)  
- **IN USE → IDLE:** If current < 0.5A continuously for 60 seconds  
- **IDLE → FREE:** If current remains below 0.1A for 300 seconds (machine powered but unused)  
- Periodic readings help monitor energy consumption and detect abnormal power draw for **maintenance alerts**.

---

## 4. Communication & Data Flow

1. **Sensor Layer:** All sensors (MPU-6050, IR, Ultrasonic, RFID, FSR, Current Sensor) feed raw data into ESP32 GPIO/ADC pins.  
2. **Processing Layer:** ESP32 firmware interprets sensor signals, applies threshold logic, and updates equipment state.  
3. **Transmission Layer:** Data is sent to the cloud via **MQTT** or **HTTP POST** in structured JSON format.  
4. **Backend Layer:** Cloud server aggregates, analyzes, and visualizes data using a web dashboard or mobile interface.  

---

## 5. Example JSON Data Packet

```json
{
  "equipment_id": "TRD01",
  "state": "IN_USE",
  "sensor_data": {
    "current": 2.3,
    "power_status": "ON",
    "reps": 0,
    "presence": true,
    "rfid_item_id": "RFID_203A7C",
    "rfid_status": "ITEM_PRESENT"
  },
  "timestamp": "2025-11-07T14:30:00Z"
}
