# 🏋️‍♂️ GymTrack: Core Sensor Implementation (Code Analysis)
### IoT Coursework Project

---

## 1. Project Overview (Based on Provided Code)
**GymTrack** is an Internet of Things (IoT) solution where multiple **ESP8266** units are deployed to monitor specific aspects of gym equipment and member tracking. Each uploaded code file manages a distinct sensor or set of sensors to report a basic status and raw readings to a Firebase Realtime Database.

**Implemented Functionalities:**
* **RFID Equipment Tracking (`RFID_Equipment.ino`):** Tracks the location of gym accessories across three defined areas and manages new item registration.
* **Ultrasonic Sensor Tracking (`UltrasonicSensor_HC_SR04.ino`):** Determines the occupied/free status and minimum distance for a single piece of equipment (e.g., a bench).
* **Current Sensor Tracking (`ACS712_CurrentSensor.ino`):** Monitors the current draw of an electrical machine to infer its usage status.
* **Combined Load Cell & User RFID Tracking (`LoadCell_RFID_User.ino`):** Manages user entry/exit logs and tracks the weight/status of a single load cell-monitored equipment.

---

## 2. Hardware and Sensor Summary (Based on Provided Code)
All projects use the **ESP8266 microcontroller** and connect to **Firebase** for data transmission.

| Code File | Primary Sensor | Equipment/Function | Data Output to Firebase |
|----------------|----------------|---------------------|--------------------------|
| `RFID_Equipment.ino` | **MFRC522 RFID Reader (x3)** | Gym Accessories / Inventory | `rfid_tag`, `location`, `timestamp`. [cite_start]**Logic:** Updates location or creates a `pending_items` entry for new tags. [cite: 157, 183, 195] |
| `UltrasonicSensor_HC_SR04.ino` | **HC-SR04 Ultrasonic Sensor (x2)** | Bench/Space Occupancy | `/equipment/bench1/status` (0=FREE, 1=OCCUPIED), `/equipment/bench1/distance` (Minimum distance in cm). [cite_start]**Logic:** Status is 'OCCUPIED' if either sensor distance is $< 20$cm. [cite: 209, 211, 214] |
| `ACS712_CurrentSensor.ino` | **ACS712 Current Sensor** | Electrical Equipment Usage | `/equipment/<id>/raw_sensor_reading` (0-1023), `/equipment/<id>/status` (AVAILABLE/UNAVAILABLE). **Logic:** Status is 'AVAILABLE' if reading deviates from `ZERO_CURRENT_ADC_VALUE` by more than `USAGE_THRESHOLD`. [cite: 228, 235, 236] |
| `LoadCell_RFID_User.ino` | **HX711 Load Cell**, **MFRC522 RFID Reader (x1)** | Single Load-Bearing Equipment & User In/Out | `/equipment/load_cell_1/weight` (float), `/equipment/load_cell_1/status` (AVAILABLE/UNAVAILABLE), `/users_in_out_log` (User entry/exit logs). **Logic:** Load Cell status is 'AVAILABLE' if weight $\ge 500$g. [cite_start]User RFID logs in/out and updates the `/users/<cardID>/inside` status. [cite: 255, 273, 285] |

---

## 3. Core Tracking Logic & Data States (Code-Specific)
The logic in the uploaded files is primarily focused on direct sensor-to-status mapping and logging, rather than complex time-based state machines.

### A. RFID Equipment Tracking (`RFID_Equipment.ino`)
* [cite_start]**Readers:** Three readers are configured: `Equipment Area` (Reader 1), `Dumbbell Space` (Reader 2), and `Free Area` (Reader 3)[cite: 145, 146, 184, 185, 186].
* [cite_start]**Priority:** Reader 1 is checked first, then Reader 2, then Reader 3[cite: 179, 180, 181].
* **New Tag Handling:**
    * [cite_start]**Reader 2:** New tag is **auto-created** in `/equipment/` with `name: "Dumbbell"`[cite: 192].
    * [cite_start]**Reader 3:** New tag is **auto-created** in `/equipment/` with `name: "Other Equipment"`[cite: 194].
    * [cite_start]**Reader 1:** New tag creates a **pending item** in `/pending_items/` for manual staff assignment[cite: 195].
* [cite_start]**Existing Tag Handling:** If a tag exists in `/equipment/`, only its `location` and `timestamp` are updated[cite: 188, 189].

### B. Ultrasonic Sensor Tracking (`UltrasonicSensor_HC_SR04.ino`)
* [cite_start]**Threshold:** A presence is detected if the distance is less than $20$cm (`THRESHOLD_CM`)[cite: 209].
* [cite_start]**Status:** `status` is set to **1 (OCCUPIED)** if $\text{dist}_1 < 20$cm **OR** $\text{dist}_2 < 20$cm; otherwise, it is **0 (FREE)**[cite: 209].
* [cite_start]**Data Logged:** `/equipment/bench1/status` and `/equipment/bench1/distance` (which is $\min(\text{dist}_1, \text{dist}_2)$) are updated[cite: 212, 214].

### C. Current Sensor Tracking (`ACS712_CurrentSensor.ino`)
* [cite_start]**Zero Point:** The sensor is centered around an ADC value of $535$ (`ZERO_CURRENT_ADC_VALUE`)[cite: 220].
* [cite_start]**Threshold:** Usage is detected if the raw reading deviates by more than $100$ (`USAGE_THRESHOLD`) from the zero point[cite: 235].
* **Status Logic:**
    * [cite_start]If $\text{rawReading} > (535 + 100)$ **OR** $\text{rawReading} < (535 - 100)$, the machine is considered **AVAILABLE** (Current is flowing / Switch is ON)[cite: 235].
    * [cite_start]Otherwise, the machine is considered **UNAVAILABLE** (No current flow / Switch is OFF)[cite: 237].
* [cite_start]**Data Logged:** `/equipment/<id>/raw\_sensor\_reading` (0-1023) and `/equipment/<id>/status` are updated[cite: 230].

### D. Combined Load Cell & User RFID Tracking (`LoadCell_RFID_User.ino`)
* **Load Cell Status:**
    * [cite_start]`weight` is read and updated to Firebase[cite: 284, 255].
    * [cite_start]`status` is **AVAILABLE** only if `weight` $\ge 500$g[cite: 285].
* **User RFID Logic:**
    * [cite_start]Scans card UID and checks if it's linked to a user in `/users/`[cite: 266, 269].
    * [cite_start]**Unassigned Card:** Logs a `denied` action to `/users_in_out_log`[cite: 269, 271].
    * [cite_start]**Assigned User:** Toggles the `/users/<cardID>/inside` state (0 $\to$ 1 or 1 $\to$ 0) [cite: 272, 273, 274] [cite_start]and pushes an `in` or `out` log entry to `/users_in_out_log`[cite: 277].

---

## 4. Communication & Data Flow (Code-Specific)
[cite_start]All systems use the **ESP8266** to read sensor data, apply the simple $\text{IF} / \text{ELSE}$ logic described above, and send the results to the **Firebase Realtime Database** over **WiFi**[cite: 159, 212, 230, 255].

* [cite_start]**Libraries:** All projects use specific Firebase libraries (`FirebaseESP8266.h` or `Firebase_ESP_Client.h`) for communication.
* [cite_start]**Authentication:** All projects use direct credentials (`FIREBASE_AUTH` token or `API_KEY` + `user/password`) for Firebase access[cite: 145, 197, 221, 244].
* [cite_start]**Timestamping:** The Load Cell + RFID project uses **NTP** to get a precise ISO-formatted timestamp for logging, while others use `millis()`[cite: 158, 245, 257].

---

## 5. Example Data Node Paths

| Code File | Example Path | Data Sent |
|---|---|---|
| `RFID_Equipment.ino` | `/equipment/5E0A73C9` | `{"location": "Equipment Area", "timestamp": 1234567, "rfid_tag": "5E0A73C9"}` |
| | `/pending_items/1C42D305` | `{"initial_location": "Free Area", "status": "PENDING_NAME_ASSIGNMENT", ...}` |
| `UltrasonicSensor_HC_SR04.ino` | `/equipment/bench1/status` | `1` (Integer) |
| | `/equipment/bench1/distance` | `15` (Integer) |
| `ACS712_CurrentSensor.ino` | `/equipment/motor_current_sensor_1/status` | `"AVAILABLE"` (String) |
| `LoadCell_RFID_User.ino` | `/equipment/load_cell_1/weight` | `12.50` (Float) |
| | `/users/F103A94D/inside` | `1` (Integer) |
| | `/users_in_out_log/unique-key` | `{"customerName": "John Doe", "action": "in", "timestamp": "2025-11-29T16:30:55", ...}` |
