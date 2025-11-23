// src/components/RFIDEquipment.js
import React, { useState, useEffect } from "react";
import "./RFIDTracker.css";
import { db } from "../Firebase";
import { ref, onValue } from "firebase/database";

function RFIDEquipment() {
  const [equipmentList, setEquipmentList] = useState([]);

  useEffect(() => {
    const equipmentRef = ref(db, "equipment");

    onValue(equipmentRef, (snap) => {
      const data = snap.val() || {};

      // 🔥 STRICT FILTER — removes "Unnamed", empty, and sensor objects
      const cleaned = Object.values(data).filter(
        (item) =>
          item &&
          typeof item === "object" &&
          item.rfid_tag && // MUST have RFID
          item.location && // MUST have location
          (item.equipment_name || item.name) // MUST have name
      );

      setEquipmentList(cleaned);
    });
  }, []);

  return (
    <div className="tracker-card">
      <h2>🏷️ Equipment Location</h2>

      {equipmentList.length === 0 ? (
        <p style={{ color: "#888" }}>No RFID equipment found...</p>
      ) : (
        equipmentList.map((item) => (
          <div key={item.rfid_tag} className="equip-card">

            {/* Status Dot */}
            <div
              className={`status-dot ${
                item.location === "Equipment Area"
                  ? "dot-green"
                  : item.location === "Free Area"
                  ? "dot-yellow"
                  : "dot-purple"
              }`}
            ></div>

            {/* Equipment name */}
            <div className="equip-title">
              {item.equipment_name || item.name}
            </div>

            {/* Location */}
            <div className="equip-location">
              Location: <span>{item.location}</span>
            </div>

            {/* RFID */}
            <div className="equip-rfid">RFID: {item.rfid_tag}</div>
          </div>
        ))
      )}
    </div>
  );
}

export default RFIDEquipment;
