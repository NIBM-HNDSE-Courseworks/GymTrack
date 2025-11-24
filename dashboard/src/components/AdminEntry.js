// src/components/AdminEntry.js
import React, { useState } from "react";
import "./AuthModal.css";

function AdminEntry({ onLogin, onClose }) {
  const [adminPassword, setAdminPassword] = useState("");
  const [error, setError] = useState("");
  const [isClosing, setIsClosing] = useState(false);

  const CORRECT_ADMIN_PASSWORD = "admin123";

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (adminPassword === CORRECT_ADMIN_PASSWORD) {
      onLogin();
    } else {
      setError("Invalid admin password.");
      setAdminPassword("");
    }
  };

  const handleCloseWithAnimation = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300); // matches fade-out duration
  };

  return (
    <div
      className={`modal-overlay ${isClosing ? "closing" : ""}`}
      onClick={handleCloseWithAnimation}
    >
      <div
        className={`auth-card ${isClosing ? "closing" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close-button" onClick={handleCloseWithAnimation}>
          &times;
        </button>

        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>Admin Access</h2>
          <p className="note">
            Enter secret password to view staff management.
          </p>

          {error && <div className="error-message">{error}</div>}

          <label htmlFor="adminPass">Admin Password</label>
          <input
            type="password"
            id="adminPass"
            placeholder="Enter admin password..."
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            required
          />

          <button type="submit" className="submit-button">
            Grant Access
          </button>
        </form>
      </div>
    </div>
  );
}

export default AdminEntry;
