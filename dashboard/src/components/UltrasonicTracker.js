// src/components/UltrasonicTracker.js
import React, { useState, useEffect } from "react";
import AddEquipmentButton from "./AddEquipmentButton";
import "./UltrasonicTracker.css"; // New CSS import

function UltrasonicTracker({ equipmentId, initialStatus }) {
  const [state, setState] = useState(initialStatus || "FREE");
  const [distance, setDistance] = useState(0); // Data Output: Distance (cm)

  useEffect(() => {
    const statusColor =
      {
        FREE: "green",
        "IN USE": "red",
        IDLE: "orange",
        MAINTENANCE: "gray",
      }[state] || "black";

    // Placeholder for simulation
    document.getElementById(`status-${equipmentId}`).style.backgroundColor =
      statusColor;
  }, [equipmentId, state]);

  return (
    <div className="tracker-group">
      <div className="group-header">
        <h2>🏋️ High-Traffic Areas (Squat Rack, etc.)</h2>
        <AddEquipmentButton equipmentType="Ultrasonic" />
      </div>
      <div className="tracker-card">
        <h3>{equipmentId}</h3>
        <p>Sensor: Ultrasonic (HC-SR04) </p>
        <div className="status-indicator" id={`status-${equipmentId}`}>
          Current State: **{state}**
        </div>
        <p>Distance Reading: **{distance} cm** </p>
        <p className="logic-note">
          Logic: FREE → IN USE: Presence = True for 10 sec [cite: 22]
        </p>
      </div>
    </div>
  );
}

export default UltrasonicTracker;
