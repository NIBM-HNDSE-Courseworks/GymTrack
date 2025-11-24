// src/components/LoadCellTracker.js
import React, { useState, useEffect } from "react";
import { db } from "../Firebase";
import { ref, onValue } from "firebase/database";
import "./LoadCellTracker.css";

const EQUIPMENT_NODE_ID = "load_cell_1";
const FIREBASE_PATH = `/equipment/${EQUIPMENT_NODE_ID}`;

function LoadCellTracker() {
  const [data, setData] = useState({
    weight: 0.0,
    status: "LOADING",
    equipment_name: "Dumbbell 500g",
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const equipmentRef = ref(db, FIREBASE_PATH);

    const unsubscribe = onValue(
      equipmentRef,
      (snapshot) => {
        const dbData = snapshot.val();

        if (dbData) {
          const weightGrams = dbData.weight || 0;

          setData({
            weight: weightGrams / 1000,
            status: dbData.status || "UNKNOWN",
            equipment_name: dbData.equipment_name || "Dumbbell 500g",
          });
        } else {
          setData((prev) => ({ ...prev, status: "NOT_FOUND" }));
        }

        setIsLoading(false);
      },
      () => {
        setData((prev) => ({ ...prev, status: "ERROR" }));
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const { status, weight, equipment_name } = data;

  const statusColor =
    {
      LOADING: "#58a6ff",
      AVAILABLE: "#2ecc71",
      PRESENT: "#2ecc71",
      UNAVAILABLE: "#f5a623",
      REMOVED: "#f5a623",
      UNKNOWN: "#d9534f",
      ERROR: "#d9534f",
      NOT_FOUND: "#6e7681",
    }[status.toUpperCase()] || "#6e7681";

  return (
    <div className="tracker-card-panel">
      {/* CLEAN TITLE — Only Item Name */}
      <div className="panel-header">
        <h2>{equipment_name}</h2>
      </div>

      {isLoading ? (
        <div className="loading-box">Connecting to Firebase...</div>
      ) : (
        <>
          {/* WEIGHT */}
          <div className="value-box">
            <label>Weight</label>
            <div className="value-number">{weight.toFixed(2)} kg</div>
          </div>

          {/* STATUS */}
          <div className="status-pill" style={{ backgroundColor: statusColor }}>
            Status: {status.replace("_", " ")}
          </div>
        </>
      )}
    </div>
  );
}

export default LoadCellTracker;
