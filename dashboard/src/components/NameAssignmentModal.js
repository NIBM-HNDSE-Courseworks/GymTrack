// src/components/NameAssignmentModal.js (New Component)

import React, { useState, useEffect } from "react";
import { db } from "../Firebase"; // Assumes Firebase configuration is imported
import { ref, update, remove, serverTimestamp } from "firebase/database";

/**
 * Modal for Staff to assign a permanent name to a new, pending RFID tag.
 * @param {object} pendingItem - The data object from /pending_items/
 * @param {function} onClose - Function to close the modal (e.g., on success or cancel)
 */
const NameAssignmentModal = ({ pendingItem, onClose }) => {
  const [equipmentName, setEquipmentName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Extract key data for clarity
  const currentTagId = pendingItem?.rfid_tag;
  const initialLocation = pendingItem?.initial_location || "Unknown Location";

  // Reset state when the modal receives a new pending item
  useEffect(() => {
    setEquipmentName("");
    setError(null);
  }, [pendingItem]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!equipmentName.trim()) {
      setError("Equipment name cannot be empty.");
      return;
    }
    if (!currentTagId) {
      setError("Error: No Tag ID found.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Create the permanent equipment record in /equipment/
      const equipmentPath = `equipment/${currentTagId}`;
      await update(ref(db, equipmentPath), {
        rfid_tag: currentTagId,
        name: equipmentName.trim(), // Staff-provided name
        location: initialLocation, // Initial location from pending data
        timestamp: serverTimestamp(),
      });

      // 2. Remove the temporary record from the /pending_items/ list
      const pendingPath = `pending_items/${currentTagId}`;
      await remove(ref(db, pendingPath));

      console.log(`SUCCESS: Assigned '${equipmentName.trim()}' to tag ${currentTagId} and moved to equipment registry.`);
      onClose(); // Close modal on successful assignment
    } catch (err) {
      console.error("Firebase Assignment Failed:", err);
      setError("Failed to complete assignment. Check the console for details.");
    } finally {
      setLoading(false);
    }
  };

  if (!pendingItem) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Assign Name to New Equipment</h3>
        
        <div className="info-display">
          <p><strong>Tag ID:</strong> <span className="tag-id">{currentTagId}</span></p>
          <p><strong>First Seen At:</strong> <span className="location">{initialLocation}</span></p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Enter Permanent Equipment Name (e.g., Dumbbell 5kg)"
            value={equipmentName}
            onChange={(e) => setEquipmentName(e.target.value)}
            disabled={loading}
          />
          {error && <p className="error-message">{error}</p>}
          <div className="modal-actions">
            <button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Assign Name & Register"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="secondary-btn"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NameAssignmentModal;