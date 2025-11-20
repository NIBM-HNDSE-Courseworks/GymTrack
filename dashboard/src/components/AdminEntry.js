// src/components/AdminEntry.js
import React, { useState } from "react";
import "./AuthModal.css"; // Reusing modal styles for simplicity

// NOTE: In a real app, you would use a secure server check here.

function AdminEntry({ onLoginSuccess, onClose }) {
  const [adminPassword, setAdminPassword] = useState("");
  const [error, setError] = useState("");

  // ADMIN PASSWORD IS HARDCODED HERE
  const CORRECT_ADMIN_PASSWORD = "admin123";

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (adminPassword === CORRECT_ADMIN_PASSWORD) {
      console.log("Admin password accepted.");
      onLoginSuccess(); // Switch to the staff dashboard
    } else {
      setError("Invalid admin password.");
      setAdminPassword("");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="auth-card" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>
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
