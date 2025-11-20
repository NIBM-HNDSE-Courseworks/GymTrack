// src/components/RFIDCapacity.js
import React, { useState } from "react";
import "./RFIDTracker.css";

function RFIDCapacity() {
  const [capacity, setCapacity] = useState(45);

  const handleEntryExit = (action) => {
    // Prevent capacity from going below zero, just in case
    if (action === "EXIT" && capacity <= 0) return;
    setCapacity(action === "ENTRY" ? capacity + 1 : capacity - 1);
  };

  // Determine indicator color based on capacity (e.g., max capacity is 50)
  const indicatorColor = capacity > 50 ? "red" : "green";

  return (
    <div className="tracker-card capacity-card">
      <h2>👤 Gym Capacity (Crowdedness)</h2>
      <div
        className="status-indicator capacity-indicator"
        style={{ backgroundColor: indicatorColor }}
      >
        Current Capacity: {capacity} members
      </div>
      <div className="capacity-buttons">
        <button onClick={() => handleEntryExit("ENTRY")}>Simulate Entry</button>
        <button onClick={() => handleEntryExit("EXIT")}>Simulate Exit</button>
      </div>
    </div>
  );
}

export default RFIDCapacity;
