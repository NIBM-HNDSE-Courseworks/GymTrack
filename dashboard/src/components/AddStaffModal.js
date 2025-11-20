// src/components/AddStaffModal.js
import React, { useState } from "react";
import "../components/AuthModal.css";
import { createStaffAccount } from "../Firebase";

function AddStaffModal({ onClose, onAdd }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const getErrorMessage = (errorCode) => {
    switch (errorCode) {
      case "auth/email-already-in-use":
        return "This email is already in use by another account.";
      case "auth/invalid-email":
        return "The email address is not valid.";
      case "auth/weak-password":
        return "The password is too weak. It must be at least 6 characters long.";
      default:
        return "An unexpected error occurred. Please try again.";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createStaffAccount({ name, email, password });
      alert(`Staff member ${name} (${email}) created successfully!`);
      onAdd();
      onClose();
    } catch (err) {
      let errorCode = "unknown-error";
      if (err.message) {
        errorCode = err.message
          .replace("Firebase: Error (", "")
          .replace(").", "")
          .trim();
      }
      setError(getErrorMessage(errorCode));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="auth-card" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose} disabled={isLoading}>
          &times;
        </button>

        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>Add Staff Member</h2>
          <p className="note">
            Name, Email, and Password required for staff access.
          </p>

          {error && <div className="error-message">🚨 {error}</div>}

          <label htmlFor="staffName">Full Name</label>
          <input
            type="text"
            id="staffName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter full name"
            required
            disabled={isLoading}
          />

          <label htmlFor="staffEmail">Email</label>
          <input
            type="email"
            id="staffEmail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email address"
            required
            disabled={isLoading}
          />

          <label htmlFor="staffPassword">Password</label>
          <input
            type="password"
            id="staffPassword"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            required
            disabled={isLoading}
          />

          <label htmlFor="confirmStaffPassword">Confirm Password</label>
          <input
            type="password"
            id="confirmStaffPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter password"
            required
            disabled={isLoading}
          />

          <button type="submit" className="submit-button" disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Staff Account"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AddStaffModal;
