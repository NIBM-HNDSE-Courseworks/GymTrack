// src/components/RFIDCapacity.js
import React, { useState } from "react";
import "./RFIDTracker.css";

function RFIDCapacity() {
  const [capacity, setCapacity] = useState(45);

  const handleEntryExit = (action) => {
    setCapacity(action === "ENTRY" ? capacity + 1 : capacity - 1);
  };

  return (
    <div className="tracker-card">
      <h2>👤 Gym Capacity (Crowdedness)</h2>
      <div
        className="status-indicator"
        style={{ backgroundColor: capacity > 50 ? "red" : "green" }}
      >
        Current Capacity: {capacity} members
      </div>
      <button onClick={() => handleEntryExit("ENTRY")}>Simulate Entry</button>
      <button onClick={() => handleEntryExit("EXIT")}>Simulate Exit</button>
    </div>
  );
}

export default RFIDCapacity;
