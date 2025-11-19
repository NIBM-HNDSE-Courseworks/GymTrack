# 🏋️‍♂️ GymTrack: Enhanced Smart Gym Equipment Tracker  
### IoT Coursework Project

---

## 1. Project Overview
**GymTrack** is an Internet of Things (IoT) solution designed to monitor gym equipment usage and facility capacity in real-time.  
By leveraging various sensors connected via an **ESP8266 microcontroller**, the system provides immediate feedback to customers regarding machine availability and generates insightful usage analytics for gym staff.

**Primary goals:**
* Accurately track the state of high-value gym equipment (**FREE, IN USE, IDLE, MAINTENANCE**).  
* Monitor facility crowding by tracking member entry/exit using **RFID User Tracking**.
* Provide data for long-term facility analysis (e.g., peak hours, maintenance scheduling).  
* Track gym accessories (e.g., dumbbells, mats, resistance bands) using **RFID Equipment Tracking** for loss prevention and equipment management.

---

## 2. Hardware and Sensor Summary
The system utilizes a central **ESP8266 microcontroller** for data acquisition, processing raw sensor inputs into meaningful status before transmission.

| Equipment Type | Primary Sensor | Detection Mechanism | Data Output |
|----------------|----------------|---------------------|--------------|
| High-Traffic Area (e.g., Squat Rack) | **Ultrasonic Sensor (HC-SR04)** | Detects an object (person) standing within the defined usage zone. | Distance (cm), Presence detected (Boolean) |
| Dumbbell Rack Slot (e.g., 20kg Dumbbell) | **Load Cell (MD0487)** | Measures weight/force to confirm if the dumbbell is present or removed. | Weight (kg), Dumbbell present (Boolean) |
| Electric Equipment (e.g., Treadmill, Elliptical) | **ACS712 Current Sensor** | Measures current draw from the power line to detect when the machine is operating. | Current (A), Power ON/OFF (Boolean) |
| **User Capacity Monitoring** | **RFID Tag + Reader (User Tracking)** | Member's card is scanned upon entry and exit to monitor facility occupancy. | Member ID, Location (Entry/Exit), Timestamp |
| Gym Accessories/Inventory | **RFID Tag + Reader (Equipment Tracking)** | Each item is tagged; reader detects tag presence for real-time inventory and usage tracking. | Item ID, Presence (Boolean), Last Scan Time |
| Microcontroller | **ESP8266 (Wi-Fi Enabled)** | Reads sensor data, applies initial logic, and sends data to the cloud API. | JSON payload via MQTT/HTTP |

---

## 3. Core Tracking Logic & Data States
The tracking function on the **ESP8266** determines the current equipment status based on sensor readings and configured time windows.

### A. Core Data States
All monitored equipment reports one of the following four critical states:

| State | Definition | Audience |
|--------|-------------|-----------|
| **FREE** | Ready for immediate use. | Customer/Staff |
| **IN USE** | Currently being operated by a member. | Customer/Staff |
| **IDLE** | Recently used (e.g., past 2 minutes) but currently empty. (Helps prevent machine “hogging”). | Staff/Analysis |
| **MAINTENANCE** | Out of service due to technical issues or cleaning (set manually by staff). | Customer/Staff |

---

### B. State Transition Examples

---

**Ultrasonic Sensor (Presence) Logic**  
* **FREE → IN USE:** If Distance reading indicates Presence = True for 10 consecutive seconds  
* **IN USE → FREE:** If Distance reading indicates Presence = False for 5 consecutive seconds  

---

**Load Cell (Equipment Presence) Logic**
* **ITEM PRESENT → ITEM REMOVED:** If measured weight drops below the defined threshold for the item.
* **ITEM REMOVED → ITEM PRESENT:** If measured weight is within the defined range for the item.

---

**Current Sensor Logic (Electrical Equipment Usage)**  
* **FREE → IN USE:** If measured current > 0.5A for at least 3 seconds (indicates motor activity)  
* **IN USE → IDLE:** If current < 0.5A continuously for 60 seconds  
* **IDLE → FREE:** If current remains below 0.1A for 300 seconds (machine powered but unused)  
* Periodic readings help monitor energy consumption and detect abnormal power draw for **maintenance alerts**.

---

**RFID Tracking Logic**

| Function | Logic | Data Logged |
|---|---|---|
| **Equipment Tracking** | *ITEM PRESENT → REMOVED*: Tag not detected near the item's station after 3 seconds. *REMOVED → PRESENT*: Tag re-detected at the station. | **Item ID**, **Location**, **Timestamp**, **Status** (Present/Removed) |
| **User Tracking** | *ENTRY*: Member's card scanned at the gym entrance. *EXIT*: Member's card scanned at the gym exit. The system maintains a running count of currently present members. | **Member ID**, **Timestamp**, **Action** (Entry/Exit), **Gym Capacity Count** |

---

## 4. Communication & Data Flow

1.  **Sensor Layer:** All sensors (Ultrasonic, Load Cell, Current Sensor, RFID Readers) feed raw data into ESP8266 GPIO/ADC pins.  
2.  **Processing Layer:** ESP8266 firmware interprets sensor signals, applies threshold logic, and updates equipment/user state.  
3.  **Transmission Layer:** Data is sent to the cloud via **MQTT** or **HTTP POST** in structured JSON format.  
4.  **Backend Layer:** Cloud server aggregates, analyzes, and visualizes data using a web dashboard or mobile interface.  

---

## 5. Example JSON Data Packet

```json
{
  "equipment_id": "TRD01",
  "state": "IN_USE",
  "sensor_data": {
    "current": 2.3,
    "power_status": "ON",
    "presence": true,
    "load_cell_weight": 0.0,
    "rfid_item_id": "RFID_203A7C",
    "rfid_status": "ITEM_PRESENT"
  },
  "user_data": {
    "member_id": "MEM_456B",
    "capacity_count": 45,
    "capacity_status": "ENTRY"
  },
  "timestamp": "2025-11-19T10:30:00Z"
}
