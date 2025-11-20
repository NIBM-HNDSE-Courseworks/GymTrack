// src/components/CurrentSensorTracker.js
import React, { useState, useEffect } from "react";
import AddEquipmentButton from "./AddEquipmentButton";
import "./CurrentSensorTracker.css"; // New CSS import

function CurrentSensorTracker({ equipmentId, initialStatus }) {
  const [state, setState] = useState(initialStatus || "FREE");
  const [current, setCurrent] = useState(0.0); // Data Output: Current (A)

  useEffect(() => {
    // Simulate data update for 'TRD01' example data
    if (equipmentId === "TRD01" && state === "FREE") {
      setTimeout(() => {
        // Simulate state transition based on logic: FREE → IN USE: Current > 0.5A for 3 sec
        setState("IN USE");
        setCurrent(2.3); // Example current draw
      }, 5000);
    }
  }, [equipmentId, state]);

  return (
    <div className="tracker-group">
      <div className="group-header">
        <h2>🏃 Electrical Machines (Treadmills)</h2>
        <AddEquipmentButton equipmentType="Current Sensor" />
      </div>
      <div className="tracker-card">
        <h3>{equipmentId}</h3>
        <p>Sensor: ACS712 Current Sensor </p>
        <p>
          Current Reading: <strong>{current} A</strong>{" "}
        </p>
        <div
          className="status-indicator"
          style={{ color: current > 0.5 ? "red" : "green" }}
        >
          Current State: <strong>{state}</strong>
        </div>
        <p className="logic-note">
          Logic: IN USE → IDLE: Current &lt; 0.5A for 60 sec
        </p>
      </div>
    </div>
  );
}

export default CurrentSensorTracker;
