// src/components/AddStaffModal.js
import React, { useState } from "react";
// Reusing AuthModal.css for modal backdrop and general styling
import "../components/AuthModal.css";
// Import the staff creation function
import { createStaffAccount } from "../Firebase"; // Assuming the path is correct

/**
 * Modal form for adding a new staff member.
 */
function AddStaffModal({ onClose, onAdd }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Helper to convert Firebase error codes to user-friendly messages
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
    e.preventDefault(); // 🔥 THIS FIXES EVERYTHING!

    try {
      // 2. Call the Firebase utility function
      await createStaffAccount({ name, email, password });

      // Success
      alert(`Staff member ${name} (${email}) created successfully!`);
      onAdd();
      onClose();
    } catch (err) {
      // Improved error handling based on the thrown message
      let errorCode = "unknown-error";
      if (err.message) {
        // This extracts the code like 'auth/email-already-in-use'
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
    // The modal-overlay is reused for the backdrop
    <div className="modal-overlay" onClick={(e) => e.stopPropagation()}>
      {/* The auth-card style is reused for the modal card */}
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
            required
            disabled={isLoading}
          />

          <label htmlFor="staffEmail">Email</label>
          <input
            type="email"
            id="staffEmail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />

          <label htmlFor="staffPassword">Password</label>
          <input
            type="password"
            id="staffPassword"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />

          <label htmlFor="confirmStaffPassword">Confirm Password</label>
          <input
            type="password"
            id="confirmStaffPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
