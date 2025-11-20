// src/components/RFIDEquipment.js
import React, { useState } from "react";
import AddEquipmentButton from "./AddEquipmentButton";
import "./RFIDTracker.css";

function RFIDEquipment() {
  const [inventoryStatus, setInventoryStatus] = useState("ITEM_PRESENT");

  return (
    <div className="tracker-card">
      <h2>🏷️ Accessory Inventory (RFID Equipment)</h2>
      <p>Mechanism: RFID Tag + Reader</p>
      <div
        className="status-indicator"
        style={{
          backgroundColor: inventoryStatus === "ITEM_PRESENT" ? "green" : "red",
        }}
      >
        Mat RFID Status: {inventoryStatus} (ID: RFID_203A7C)
      </div>
    </div>
  );
}

export default RFIDEquipment;
