import React, { useEffect, useState } from "react";
import "./AddRFIDEquipmentModal.css";
import { db } from "../Firebase";
import { ref, get, set } from "firebase/database";

function AddRFIDEquipmentModal({ onClose }) {
  const [pendingList, setPendingList] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);
  const [selectedRFID, setSelectedRFID] = useState(null);
  const [equipmentName, setEquipmentName] = useState("");
  const [isReloading, setIsReloading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // CLOSE WITH ANIMATION
  const triggerClose = () => {
    setIsClosing(true);
    setTimeout(() => onClose(), 300); // matches CSS closing animation
  };

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!isMounted) return;

      setIsReloading(true);

      try {
        const [pendingSnap, equipmentSnap] = await Promise.all([
          get(ref(db, "pending_items")),
          get(ref(db, "equipment")),
        ]);

        if (!isMounted) return;

        const pendingData = pendingSnap.exists() ? pendingSnap.val() : {};
        const equipmentData = equipmentSnap.exists() ? equipmentSnap.val() : {};

        setPendingList(Object.values(pendingData));
        setEquipmentList(Object.values(equipmentData));
      } catch (err) {
        console.error("Error loading equipment modal data:", err);
      } finally {
        setTimeout(() => {
          if (isMounted) setIsReloading(false);
        }, 500);
      }
    };

    loadData();

    const intervalId = setInterval(loadData, 3000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  const handleConnect = async () => {
    if (!selectedRFID) return alert("Select a pending RFID first!");
    if (!equipmentName.trim()) return alert("Enter equipment name!");

    const rfid = selectedRFID.rfid_tag;

    try {
      await set(ref(db, `equipment/${rfid}`), {
        rfid_tag: rfid,
        equipment_name: equipmentName,
        equipment_id: `EQP_${rfid.substring(0, 4)}`,
        initial_location: "Equipment Area",
        status: "ACTIVE",
        timestamp: Date.now(),
      });

      await set(ref(db, `pending_items/${rfid}`), {
        ...selectedRFID,
        status: "NAME_ASSIGNED",
        equipment_name: equipmentName,
      });

      alert("Equipment assigned successfully!");
      setSelectedRFID(null);
      setEquipmentName("");
    } catch (err) {
      console.error("Error assigning equipment:", err);
      alert("Failed to assign equipment.");
    }
  };

  const filteredPending = pendingList.filter(
    (p) => p.status === "PENDING_NAME_ASSIGNMENT"
  );

  const filteredAssigned = equipmentList.filter((e) =>
    pendingList.some((p) => p.rfid_tag === e.rfid_tag)
  );

  return (
    <div
      className={`modal-overlay ${isClosing ? "closing" : ""}`}
      onClick={triggerClose}
    >
      <div
        className={`modal ${isClosing ? "closing" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="reload-status">
          <span className={`reload-icon ${isReloading ? "reloading" : ""}`}>
            ⟳
          </span>
          <span className="reload-text">
            {isReloading ? "Loading..." : "Updated"}
          </span>
        </div>

        <h2>Assign RFID to Equipment</h2>

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

        <div className="input-row">
          <label>Equipment Name</label>
          <input
            type="text"
            placeholder="Enter equipment name..."
            value={equipmentName}
            onChange={(e) => setEquipmentName(e.target.value)}
          />
        </div>

        <div className="connect-row">
          <button className="btn connect" onClick={handleConnect}>
            CONNECT
          </button>
          <button className="btn cancel" onClick={triggerClose}>
            CLOSE
          </button>
        </div>

        <div className="assigned-section">
          <h3>Assigned Equipment</h3>
          <div className="list">
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
    </div>
  );
}

export default AddRFIDEquipmentModal;
