// components/CrowdedSummaryCard.js
import React, { useState, useEffect } from "react";
import { db } from "../Firebase";
import { ref, onValue } from "firebase/database";

const MAX_CAPACITY_ALERT = 3;
const HIGH_CAPACITY_WARNING = 2;

export default function CrowdedSummaryCard() {
  const [currentUsers, setCurrentUsers] = useState(0);

  useEffect(() => {
    const usersRef = ref(db, "users");
    return onValue(usersRef, (snapshot) => {
      const usersData = snapshot.val();
      if (!usersData) {
        setCurrentUsers(0);
        return;
      }

      let inside = 0;
      Object.values(usersData).forEach((u) => {
        if (u.inside === 1) inside++;
      });
      setCurrentUsers(inside);
    });
  }, []);

  const indicatorColor =
    currentUsers >= MAX_CAPACITY_ALERT
      ? "#d9534f"
      : currentUsers >= HIGH_CAPACITY_WARNING
      ? "#f0ad4e"
      : "#5cb85c";

  const statusText =
    currentUsers >= MAX_CAPACITY_ALERT
      ? "MAX CAPACITY REACHED!"
      : currentUsers >= HIGH_CAPACITY_WARNING
      ? "Crowded"
      : currentUsers > 0
      ? "Optimal"
      : "Empty";

  return (
    <div className="tracker-card" style={{ maxWidth: "600px" }}>
      <h2 style={{ color: "orange" }}>👤 Gym Capacity (Crowdedness)</h2>

      <div
        className="status-indicator capacity-indicator"
        style={{ backgroundColor: indicatorColor }}
      >
        <span
          style={{
            color: "white",
            fontSize: "1.5em",
            fontWeight: "bold",
          }}
        >
          {statusText}
        </span>
      </div>

      <div className="capacity-display">
        <p
          style={{
            color: "orange",
            fontSize: "1.2em",
            marginBottom: "5px",
          }}
        >
          Current Members Inside:
        </p>

        <div
          style={{
            color: "white",
            fontSize: "4em",
            fontWeight: "900",
          }}
        >
          {currentUsers}
        </div>

        <p style={{ color: "white", opacity: 0.7, marginTop: "5px" }}>
          Tracking up to {MAX_CAPACITY_ALERT} for alert.
        </p>
      </div>
    </div>
  );
}
