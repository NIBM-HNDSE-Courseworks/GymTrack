// src/components/UltrasonicTracker.js
import React, { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "C:\Users\nisha\Desktop\G Clone\GymTrack\dashboard\src\Firebase.js"; // Correct path to your firebase.js
import AddEquipmentButton from "./AddEquipmentButton";
import "./UltrasonicTracker.css";

function UltrasonicTracker() {
  const [state, setState] = useState("FREE");

  // Status color mapping
  const statusColor = {
    FREE: "green",
    OCCUPIED: "red",
  }[state] || "black";

  useEffect(() => {
    // Hardcoded Firebase path for bench1
    const statusRef = ref(db, "/equipment/bench1/status");

    // Listen for real-time changes
    const unsubscribe = onValue(statusRef, (snapshot) => {
      const value = snapshot.val();

      // Update state based on Firebase value
      if (value === 1) setState("OCCUPIED");
      else setState("FREE");
    });

    return () => unsubscribe(); // Cleanup on unmount
  }, []);

  return (
    <div className="tracker-group tracker-card">
      <div className="group-header">
        <h2>🏋️ Bench 1 Status</h2>
        <AddEquipmentButton equipmentType="Ultrasonic" />
      </div>
      <div className="tracker-card-content">
        <h3>Bench 1</h3>
        <p>Sensor: Ultrasonic (HC-SR04)</p>
        <div
          className="status-indicator"
          style={{ backgroundColor: statusColor }}
        >
          Current State: {state}
        </div>
        <p className="logic-note">
          Logic: 0 = FREE, 1 = OCCUPIED (from Firebase)
        </p>
      </div>
    </div>
  );
}

export default UltrasonicTracker;
