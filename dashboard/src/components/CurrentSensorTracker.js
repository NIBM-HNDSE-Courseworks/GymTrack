// src/components/CurrentSensorTracker.js
import React, { useState, useEffect } from "react";
import { db } from "../Firebase";
import { ref, onValue } from "firebase/database";
import "./CurrentSensorTracker.css";

const EQUIPMENT_NODE_ID = "motor_current_sensor_1";
const FIREBASE_PATH = `/equipment/${EQUIPMENT_NODE_ID}`;

function CurrentSensorTracker() {
  const [data, setData] = useState({
    raw_reading: 0,
    status: "LOADING",
    equipment_id: EQUIPMENT_NODE_ID,
    display_name: "Electrical Machines (Treadmills)",
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const equipmentRef = ref(db, FIREBASE_PATH);

    const unsub = onValue(
      equipmentRef,
      (snapshot) => {
        const dbData = snapshot.val();

        if (dbData) {
          setData({
            raw_reading: dbData.raw_sensor_reading || 0,
            status: dbData.status || "UNKNOWN",
            equipment_id: dbData.equipment_id || EQUIPMENT_NODE_ID,
            display_name: "Electrical Machines (Treadmills)",
          });
        } else {
          setData((prev) => ({
            ...prev,
            status: "NOT_FOUND",
          }));
        }

        setIsLoading(false);
      },
      () => {
        setData((prev) => ({ ...prev, status: "ERROR" }));
        setIsLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const { status, raw_reading, display_name } = data;

  const statusColor =
    {
      LOADING: "#58a6ff",
      AVAILABLE: "#2ecc71",
      UNAVAILABLE: "#f5a623",
      UNKNOWN: "#d9534f",
      ERROR: "#d9534f",
      NOT_FOUND: "#6e7681",
    }[status] || "#6e7681";

  return (
    <div className="tracker-card-panel">
      {/* CLEAN TITLE — Only user-friendly group name */}
      <div className="panel-header">
        <h2>{display_name}</h2>
      </div>

      {isLoading ? (
        <div className="loading-box">Connecting to Firebase...</div>
      ) : (
        <>
          <div className="value-box">
            <label>Raw Current Reading</label>
            <div className="value-number">{raw_reading}</div>
          </div>

          <div className="status-pill" style={{ backgroundColor: statusColor }}>
            Status: {status.replace("_", " ")}
          </div>
        </>
      )}
    </div>
  );
}

export default CurrentSensorTracker;
