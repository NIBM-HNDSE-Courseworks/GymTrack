// src/components/LoadCellTracker.js
import React, { useState, useEffect } from "react";
import { db } from "../Firebase";
import { ref, onValue } from "firebase/database";
import "./LoadCellTracker.css"; // Ensure this CSS file is used

// --- CONFIGURATION CONSTANTS (Essential for Firebase connection) ---
const EQUIPMENT_NODE_ID = "load_cell_1";
const FIREBASE_PATH = `/equipment/${EQUIPMENT_NODE_ID}`;
// ------------------------------------------------------------------

function LoadCellTracker() {
  const [data, setData] = useState({
    weight: 0.0,
    status: "LOADING",
    equipment_name: "Dumbbell-500g",
  });
  const [isLoading, setIsLoading] = useState(true);

  // Database Listener for Real-Time Load Cell Data
  useEffect(() => {
    const equipmentRef = ref(db, FIREBASE_PATH);

    const unsubscribe = onValue(equipmentRef, (snapshot) => {
      const dbData = snapshot.val();
      
      if (dbData) {
        // Firebase weight is in grams (from your Arduino code)
        const weightGrams = dbData.weight || 0.0; 
        
        setData({
          // Convert grams to kg for display (0.51kg from 510g)
          weight: weightGrams / 1000.0, 
          status: dbData.status || "UNKNOWN",
          equipment_name: dbData.equipment_name || "Dumbbell-500g",
        });
        setIsLoading(false);
      } else {
        setData(prev => ({ ...prev, status: "NOT_FOUND" }));
        setIsLoading(false);
      }
    }, (error) => {
      console.error("Firebase read failed:", error);
      setData(prev => ({ ...prev, status: "ERROR" }));
      setIsLoading(false);
    });

    // Cleanup listener on component unmount
    return () => unsubscribe();
  }, []);

  const { status, weight, equipment_name } = data;

  // Determine indicator color based on the status reported by the Arduino
  const statusIndicatorColor = (() => {
    if (isLoading || status === "LOADING") return "#5bc0de"; // Blue for loading
    // Status is "AVAILABLE" (Green) or "UNAVAILABLE" (Orange/Yellow)
    if (status === "AVAILABLE" || status.toUpperCase().includes("PRESENT")) return "#5cb85c"; // Green
    if (status === "UNAVAILABLE" || status.toUpperCase().includes("REMOVED")) return "#f0ad4e"; // Orange
    return "#d9534f"; // Red for error
  })();
  
  // Format weight for display with 2 decimal places and the " kg" unit
  const weightDisplay = parseFloat(weight).toFixed(2) + " kg";
  
  // Format status text
  const statusDisplay = status.toUpperCase().replace('_', ' ');

  return (
    <div className="tracker-group">
      <div className="group-header">
        <h2>🏋️‍♂️ {equipment_name}</h2>
      </div>
      
      {isLoading ? (
        <div className="tracker-card loading-state">
          <p style={{ color: "#8b949e", textAlign: 'center' }}>
            Connecting to Firebase...
          </p>
        </div>
      ) : (
        <div className="tracker-card simplified-loadcell">
          
          {/* 1. Weight Reading */}
          <div className="loadcell-reading-box">
            <p className="reading-label">Weight Reading:</p>
            <p className="reading-value">{weightDisplay}</p>
          </div>
          
          {/* 2. Item Status */}
          <div
            className="status-indicator simplified-status"
            style={{ backgroundColor: statusIndicatorColor }}
          >
            Item Status: **{statusDisplay}**
          </div>
        </div>
      )}
    </div>
  );
}

export default LoadCellTracker;