// src/components/UltrasonicTracker.js
import React, { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../Firebase";
import "./UltrasonicTracker.css";

function UltrasonicTracker() {
  const [state, setState] = useState("FREE");
  const [distance, setDistance] = useState(0);

  const statusColor =
    {
      FREE: "#2ecc71",
      "IN USE": "#f5a623",
    }[state] || "#6e7681";

  useEffect(() => {
<<<<<<< HEAD
    const statusRef = ref(db, `/equipment/bench1/status`);
    const distanceRef = ref(db, `/equipment/bench1/distance`);
=======
    const statusRef = ref(db, /equipment/bench1/status);
    const distanceRef = ref(db, /equipment/bench1/distance);
>>>>>>> 39925ab043aa57ee2665b2a255b95b31a35a8c14

    const unsub1 = onValue(statusRef, (snapshot) => {
      const value = snapshot.val();
      setState(value === 1 ? "IN USE" : "FREE");
    });

    const unsub2 = onValue(distanceRef, (snapshot) => {
      const value = snapshot.val();
      setDistance(value || 0);
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  return (
    <div className="tracker-card-panel">
      <div className="panel-header">
        <h2>Bench 01</h2>
      </div>

      {/* DISTANCE */}
      <div className="value-box">
        <label>Detected Distance</label>
        <div className="value-number">{distance} cm</div>
      </div>

      {/* STATUS */}
      <div className="status-pill" style={{ backgroundColor: statusColor }}>
        Status: {state}
      </div>
    </div>
  );
}

export default UltrasonicTracker;