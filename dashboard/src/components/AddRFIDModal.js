import React, { useState } from "react";
import { db } from "../Firebase";
import { ref, set } from "firebase/database";

function AddRFIDModal({ cardID, onClose, onAdd }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name) return setError("Name cannot be empty!");

    setIsLoading(true);

    try {
      await set(ref(db, `users/${cardID}`), {
        name,
        registered: true,
        inside: 0,
      });

      alert(`User "${name}" added with CardID: ${cardID}`);
      onAdd();
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to add user. Try again.");
    }

    setIsLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="auth-card" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>
          ×
        </button>

        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>New RFID User</h2>
          <p>Add details for Card ID: {cardID}</p>

          {error && <div className="error-message">⚠ {error}</div>}

          <label>Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
          />

          <button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : "Add User"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AddRFIDModal;
