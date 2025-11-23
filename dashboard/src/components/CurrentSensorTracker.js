// src/components/CurrentSensorTracker.js
import React, { useState, useEffect } from "react";
import { db } from "../Firebase";
import { ref, onValue } from "firebase/database";
import "./CurrentSensorTracker.css"; // Use the new CSS file

// --- CONFIGURATION CONSTANTS (Must match Arduino code) ---
// Note: This ID is different from the LoadCell one.
const EQUIPMENT_NODE_ID = "motor_current_sensor_1";
const FIREBASE_PATH = `/equipment/${EQUIPMENT_NODE_ID}`;
// ------------------------------------------------------------------

function CurrentSensorTracker() {
  const [data, setData] = useState({
    raw_reading: 0,
    status: "LOADING",
    equipment_id: EQUIPMENT_NODE_ID,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Database Listener for Real-Time Current Sensor Data
  useEffect(() => {
    const equipmentRef = ref(db, FIREBASE_PATH);

    const unsubscribe = onValue(equipmentRef, (snapshot) => {
      const dbData = snapshot.val();

      if (dbData) {
        // Data structure from CurrentSensor_Tracker.ino:
        // raw_sensor_reading (int 0-1023) and status (String)
        const rawReading = dbData.raw_sensor_reading || 0;

        setData({
          raw_reading: rawReading,
          status: dbData.status || "UNKNOWN",
          equipment_id: dbData.equipment_id || EQUIPMENT_NODE_ID,
          display_name: "Electrical Machines (Treadmills)"
        });
        setIsLoading(false);
      } else {
        setData((prev) => ({ ...prev, status: "NOT_FOUND", display_name: "Electrical Machines (Treadmills)" }));
        setIsLoading(false);
      }
    }, (error) => {
      console.error("Firebase read failed:", error);
      setData((prev) => ({ ...prev, status: "ERROR" }));
      setIsLoading(false);
    });

    // Cleanup listener on component unmount
    return () => unsubscribe();
  }, []);

  const { status, raw_reading, display_name } = data;

  // Determine indicator color based on the status reported by the Arduino
  const statusIndicatorColor = (() => {
    if (isLoading || status === "LOADING") return "#5bc0de"; // Blue for loading
    // Status is "AVAILABLE" (Green) or "UNAVAILABLE" (Orange/Yellow)
    if (status === "AVAILABLE") return "#5cb85c"; // Green
    if (status === "UNAVAILABLE") return "#f0ad4e"; // Orange/Yellow
    return "#d9534f"; // Red for error/unknown
  })();

  // Format status text
  const statusDisplay = status.toUpperCase().replace('_', ' ');

  return (
    <div className="tracker-group">
      <div className="group-header">
        {/* Use equipment_id as the title for this tracker */}
        <h2>🏃 {display_name}</h2>
      </div>

      {isLoading ? (
        <div className="tracker-card loading-state">
          <p style={{ color: "#8b949e", textAlign: 'center' }}>
            Connecting to Firebase...
          </p>
        </div>
      ) : (
        <div className="tracker-card current-sensor-card">

          {/* 1. Raw Reading (Current Draw) */}
          <div className="current-reading-box">
            <p className="reading-label">Raw Current Reading (A0):</p>
            <p className="reading-value">{raw_reading}</p>
          </div>

          {/* 2. Equipment Status */}
          <div
            className="status-indicator current-status"
            style={{ backgroundColor: statusIndicatorColor }}
          >
            Machine Status: *{statusDisplay}*
          </div>
          
          {/* Note on Threshold */}
          {/*<p className="threshold-note">
            Status changes at threshold: **{raw_reading >= 80 ? 'Active' : 'Idle'}**
          </p>*/}
        </div>
      )}
    </div>
  );
}

export default CurrentSensorTracker;