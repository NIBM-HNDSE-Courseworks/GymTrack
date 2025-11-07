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

---

## 2. Hardware and Sensor Summary
The system utilizes a central **ESP32 microcontroller** for data acquisition, processing raw sensor inputs into meaningful equipment status before transmission.

| Equipment Type | Primary Sensor | Detection Mechanism | Data Output |
|----------------|----------------|---------------------|--------------|
| Rep-Counting Machine (e.g., Lat Pulldown) | MPU-6050 Accelerometer | Detects up/down motion (Y-axis change) to count reps. | Reps/minute, Motion detected (Boolean) |
| Seated Equipment (e.g., Bench Press) | IR Proximity Sensor | Detects an object (person) within immediate proximity of the seat. | Presence detected (Boolean) |
| High-Traffic Area (e.g., Squat Rack) | Ultrasonic Sensor (HC-SR04) | Detects an object (person) standing within the defined usage zone. | Distance (cm), Presence detected (Boolean) |
| Dumbbell Rack Slot (e.g., 20kg Dumbbell) | Force Sensitive Resistor (FSR) | Measures pressure to confirm if the dumbbell is present or removed. | Weight (kg), Dumbbell present (Boolean) |
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

**MPU-6050 (Rep Counting) Logic**
