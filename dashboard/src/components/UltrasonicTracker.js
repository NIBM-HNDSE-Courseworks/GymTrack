// src/components/UltrasonicTracker.js
import React, { useState, useEffect } from "react";
import AddEquipmentButton from "./AddEquipmentButton";
import "./UltrasonicTracker.css"; // New CSS import

function UltrasonicTracker({ equipmentId, initialStatus }) {
  const [state, setState] = useState(initialStatus || "FREE");
  const [distance, setDistance] = useState(0); // Data Output: Distance (cm)

  // Determine status color using standard functional indicators
  const statusColor =
    {
      // Red/Green/Orange/Gray are kept here for their functional meaning (status alerts)
      FREE: "green",
      "IN USE": "red",
      IDLE: "orange",
      MAINTENANCE: "gray",
    }[state] || "black";

  // Simulation: Update distance and state over time (optional, but good for demonstration)
  useEffect(() => {
    // Example: Simulate distance changes, which would trigger a real state change in production
    const interval = setInterval(() => {
      // Simulate random distance between 10cm (occupied) and 100cm (free)
      const newDistance = Math.floor(Math.random() * 90) + 10;
      setDistance(newDistance);

      // Simplified simulation logic: < 20cm means IN USE, > 80cm means FREE
      if (newDistance < 20 && state !== "IN USE") {
        setState("IN USE");
      } else if (newDistance > 80 && state !== "FREE") {
        setState("FREE");
      }
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [state]);

  // Removed the anti-pattern useEffect that manipulated the DOM directly.
  // Now, the color is set inline below using the statusColor variable.

  return (
    <div className="tracker-group tracker-card">
      <div className="group-header">
        <h2>🏋️ High-Traffic Areas (Squat Rack, etc.)</h2>
        <AddEquipmentButton equipmentType="Ultrasonic" />
      </div>
      <div className="tracker-card-content">
        <h3>{equipmentId}</h3>
        <p>Sensor: Ultrasonic (HC-SR04) </p>
        <div
          className="status-indicator"
          style={{ backgroundColor: statusColor }} // Use inline style based on statusColor variable
        >
          Current State: **{state}**
        </div>
        <p>Distance Reading: **{distance} cm** </p>
        <p className="logic-note">
          Logic: FREE → IN USE: Presence = True for 10 sec
        </p>
      </div>
    </div>
  );
}

export default UltrasonicTracker;
