import React, { useEffect, useState } from "react";
import "./AddRFIDEquipmentModal.css";
import { db } from "../Firebase";
import { ref, onValue, set } from "firebase/database";

function AddRFIDEquipmentModal({ onClose }) {
  const [pendingList, setPendingList] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);
  const [selectedRFID, setSelectedRFID] = useState(null);
  const [equipmentName, setEquipmentName] = useState("");
  const [isReloading, setIsReloading] = useState(false);

  useEffect(() => {
    const pendingRef = ref(db, "pending_items");
    const equipmentRef = ref(db, "equipment");
    setIsReloading(true);

    // Load pending list
    onValue(pendingRef, (snap) => {
      const data = snap.val() || {};
      setPendingList(Object.values(data));
      setIsReloading(false);
    });

    // Load equipment list
    onValue(equipmentRef, (snap) => {
      const data = snap.val() || {};
      setEquipmentList(Object.values(data));
    });
  }, []);

  const handleConnect = async () => {
    if (!selectedRFID) return alert("Select a pending RFID first!");
    if (!equipmentName.trim()) return alert("Enter equipment name!");

    const rfid = selectedRFID.rfid_tag;

    // Save equipment data
    await set(ref(db, `equipment/${rfid}`), {
      rfid_tag: rfid,
      equipment_name: equipmentName,
      equipment_id: `EQP_${rfid.substring(0, 4)}`,
      initial_location: "Equipment Area",
      status: "ACTIVE",
      timestamp: Date.now(),
    });

    // Update pending list status only
    await set(ref(db, `pending_items/${rfid}`), {
      ...selectedRFID,
      status: "NAME_ASSIGNED",
      equipment_name: equipmentName,
    });

    alert("Equipment assigned successfully!");
    setSelectedRFID(null);
    setEquipmentName("");
  };

  // Show pending items whose status is PENDING_NAME_ASSIGNMENT AND exist in equipment
  const filteredPending = pendingList.filter(
    (p) => p.status === "PENDING_NAME_ASSIGNMENT"
  );

  // Show assigned equipment only if RFID exists in pending_items
  const filteredAssigned = equipmentList.filter((e) =>
    pendingList.some((p) => p.rfid_tag === e.rfid_tag)
  );

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="reload-status">
          <span className={`reload-icon ${isReloading ? "reloading" : ""}`}>
            ⟳
          </span>
          <span className="reload-text">
            {isReloading ? "Loading..." : "Updated"}
          </span>
        </div>

        <h2>Assign RFID to Equipment</h2>

        {/* PENDING LIST */}
        <div className="pending-section">
          <h3>Pending RFID Tags</h3>
          <div className="list">
            {filteredPending.length === 0 ? (
              <div className="list-empty">No pending RFID items</div>
            ) : (
              filteredPending.map((item) => (
                <div
                  key={item.rfid_tag}
                  className={
                    "list-item " +
                    (selectedRFID?.rfid_tag === item.rfid_tag ? "selected" : "")
                  }
                  onClick={() => setSelectedRFID(item)}
                >
                  <strong>{item.rfid_tag}</strong>
                  <br />
                  <span style={{ fontSize: "0.9rem", color: "#8b949e" }}>
                    {item.initial_location}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* INPUT */}
        <div className="input-row">
          <label>Equipment Name</label>
          <input
            type="text"
            placeholder="Enter equipment name..."
            value={equipmentName}
            onChange={(e) => setEquipmentName(e.target.value)}
          />
        </div>

        {/* BUTTONS */}
        <div className="connect-row">
          <button className="btn connect" onClick={handleConnect}>
            CONNECT
          </button>
          <button className="btn cancel" onClick={onClose}>
            CLOSE
          </button>
        </div>

        {/* ASSIGNED LIST */}
        <div className="assigned-section">
          <h3>Assigned Equipment</h3>
          {filteredAssigned.length === 0 ? (
            <div className="list-empty">No equipment assigned yet</div>
          ) : (
            filteredAssigned.map((e) => (
              <div key={e.rfid_tag} className="assignment-row">
                <strong>{e.equipment_name}</strong>
                <br />
                ID: {e.equipment_id}
                <br />
                RFID: {e.rfid_tag}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default AddRFIDEquipmentModal;
