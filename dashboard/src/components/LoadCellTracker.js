// src/components/LoadCellTracker.js
import React, { useState } from "react";
import AddEquipmentButton from "./AddEquipmentButton";
import "./LoadCellTracker.css"; // New CSS import

function LoadCellTracker({ equipmentId }) {
  const [weight, setWeight] = useState(15.0); // Data Output: Weight (kg)
  const [status, setStatus] = useState("PRESENT");

  // Simulate Load Cell removal/return logic [cite: 25, 26]
  const handleToggle = () => {
    if (status === "PRESENT") {
      setWeight(0.0);
      setStatus("REMOVED"); // ITEM PRESENT → REMOVED: Weight below threshold [cite: 25]
    } else {
      setWeight(15.0);
      setStatus("PRESENT"); // REMOVED → PRESENT: Weight back in valid range [cite: 26]
    }
  };

  return (
    <div className="tracker-group">
      <div className="group-header">
        <h2>💪 Dumbbell Racks/Slots</h2>
        <AddEquipmentButton equipmentType="Load Cell" />
      </div>
      <div className="tracker-card">
        <h3>{equipmentId} (15kg Slot)</h3>
        <p>Sensor: Load Cell (MD0487) </p>
        <p>Weight Reading: **{weight} kg** </p>
        <div
          className="status-indicator"
          style={{ color: status === "PRESENT" ? "green" : "orange" }}
        >
          Item Status: **{status}**
        </div>
        <button onClick={handleToggle}>
          Simulate {status === "PRESENT" ? "Removal" : "Return"}
        </button>
      </div>
    </div>
  );
}

export default LoadCellTracker;
