import React, { useState } from "react";
import "../components/EditStaffModel.css";
import { updateStaffAccount } from "../Firebase";

function EditStaffModal({ staffData, onClose, onUpdate }) {
  const [name, setName] = useState(staffData.name);
  const [email, setEmail] = useState(staffData.email);
  const [password, setPassword] = useState(""); // optional
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleUpdate = async () => {
    setLoading(true);
    setError("");

    try {
      await updateStaffAccount(staffData.id, { name, email, password });
      onUpdate();
      onClose();
    } catch (err) {
      console.error("Update failed:", err);
      setError(err.message || "Failed to update staff. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Edit Staff</h2>
        {error && <p className="error-message">{error}</p>}

        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="New Password (optional)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="modal-actions">
          <button onClick={handleUpdate} disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default EditStaffModal;
