// src/components/LoginButton.js
import React from "react";
import "./LoginButton.css";

/**
 * Renders the Login button and triggers the modal visibility on click.
 * @param {function} onClick - Function to open the Auth Modal.
 */
function LoginButton({ onClick }) {
  return (
    <button className="login-button" onClick={onClick}>
      Login
    </button>
  );
}

export default LoginButton;
