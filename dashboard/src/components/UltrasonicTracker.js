// src/components/UltrasonicTracker.js
import React, { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../Firebase";
import "./UltrasonicTracker.css";

function UltrasonicTracker({ equipmentId }) {
  const [state, setState] = useState("FREE");
  const [distance, setDistance] = useState(0); // Optional: if you later save distance in Firebase

  // Color mapping
  const statusColor =
    {
      FREE: "#2ecc71",
      "IN USE": "red",
    }[state] || "black";

  useEffect(() => {
    if (!equipmentId) return;

    // Firebase path: /equipment/bench1/status
    const statusRef = ref(db, `/equipment/bench1/status`);

    // Listen to Firebase LIVE updates
    const unsubscribe = onValue(statusRef, (snapshot) => {
      const value = snapshot.val();

      // 0 → FREE | 1 → OCCUPIED
      if (value === 1) setState("IN USE");
      else setState("FREE");
    });

    return () => unsubscribe();
  }, [equipmentId]);

  return (
    <div className="tracker-group tracker-card">
      <div className="group-header">
        <h2>🏋 Bench (01)</h2>
        
      </div>

      <div className="tracker-card-content">
        <h3>{equipmentId}</h3>
       

        <div
          className="status-indicator"
          style={{ backgroundColor: statusColor }}
        >
          Current State: {state}
        </div>

      </div>
    </div>
  );
}

export default UltrasonicTracker;
