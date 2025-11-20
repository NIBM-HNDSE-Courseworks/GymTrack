import React, { useState, useEffect } from "react";
import "./RFIDTracker.css";
import { db } from "../Firebase";
import { ref, onValue } from "firebase/database";

// Define capacity thresholds for visual representation
// These can be adjusted based on your gym's physical limits.
const MAX_CAPACITY_ALERT = 50;
const HIGH_CAPACITY_WARNING = 40;

function RFIDCapacity() {
  // <span style="color:orange">State to store the real-time count of users inside</span>
  const [currentUsers, setCurrentUsers] = useState(0);

  // <span style="color:white">Database Listener for Real-Time Capacity</span>
  useEffect(() => {
    // <span style="color:white">Listen to the root 'users' node, which contains card IDs.</span>
    const usersRef = ref(db, "users");

    // <span style="color:white">onValue will run every time the data at /users changes</span>
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const usersData = snapshot.val();
      if (!usersData) {
        setCurrentUsers(0);
        return;
      }

      let insideCount = 0;
      // <span style="color:white">Iterate through all user/card entries</span>
      Object.values(usersData).forEach((userData) => {
        // <span style="color:white">The Arduino code sets 'inside: 1' for entry and 'inside: 0' for exit.</span>
        if (userData && userData.inside === 1) {
          insideCount += 1;
        }
      });

      // <span style="color:white">Update the state with the total count of users currently inside</span>
      setCurrentUsers(insideCount);
    });

    // <span style="color:white">Cleanup listener on component unmount</span>
    return () => unsubscribe();
  }, []);

  // <span style="color:white">Determine indicator color based on current capacity</span>
  const indicatorColor = (() => {
    if (currentUsers >= MAX_CAPACITY_ALERT) {
      return "#d9534f"; // Red for danger/max limit exceeded
    }
    if (currentUsers >= HIGH_CAPACITY_WARNING) {
      return "#f0ad4e"; // Orange/Yellow for high capacity warning
    }
    return "#5cb85c"; // Green for safe capacity
  })();

  const statusText = (() => {
    if (currentUsers >= MAX_CAPACITY_ALERT) return "MAX CAPACITY REACHED!";
    if (currentUsers >= HIGH_CAPACITY_WARNING) return "Crowded";
    if (currentUsers > 0) return "Optimal";
    return "Empty";
  })();

  return (
    <div className="tracker-card capacity-card">
      <h2>👤 Gym Capacity (Crowdedness)</h2>
      <div
        className="status-indicator capacity-indicator"
        style={{ backgroundColor: indicatorColor }}
      >
        <span style={{ color: "white", fontSize: "1.5em", fontWeight: "bold" }}>
          {statusText}
        </span>
      </div>

      {/* <span style="color:orange">Display the real-time user count beautifully</span> */}
      <div className="capacity-display">
        <p style={{ color: "orange", fontSize: "1.2em", marginBottom: "5px" }}>
          Current Members Inside:
        </p>
        <div style={{ color: "white", fontSize: "4em", fontWeight: "900" }}>
          {currentUsers}
        </div>
        <p style={{ color: "white", opacity: 0.7, marginTop: "5px" }}>
          Tracking up to {MAX_CAPACITY_ALERT} for alert.
        </p>
      </div>

      {/* <span style="color:white">Removed Simulation Buttons</span> */}
    </div>
  );
}

export default RFIDCapacity;
