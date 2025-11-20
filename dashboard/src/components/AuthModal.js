import React, { useState, useEffect, useCallback } from "react";
import { auth, db } from "../Firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { ref, set } from "firebase/database";
import "./AuthModal.css";

function AuthModal({ isVisible, onClose, onAdminRedirect }) {
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [shouldRender, setShouldRender] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [adminKeyCount, setAdminKeyCount] = useState(0);
  const ANIMATION_DURATION = 300;

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // LOGIN
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      alert("Login success!");
      handleClose();
    } catch (err) {
      alert("Login failed: " + err.message);
    }
  };

  // SIGNUP
  const handleSignupSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    try {
      const userCred = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      await updateProfile(userCred.user, { displayName: name });

      await set(ref(db, "customers/" + userCred.user.uid), {
        uid: userCred.user.uid,
        name,
        email,
        role: "customer",
        createdAt: new Date().toISOString(),
      });

      alert("Customer signed up successfully!");
      handleClose();
    } catch (err) {
      alert("Signup failed: " + err.message);
    }
  };

  // --- Effects ---
  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      setIsClosing(false);
    } else if (shouldRender) {
      setIsClosing(true);
      const t = setTimeout(() => {
        setShouldRender(false);
        setAdminKeyCount(0);
      }, ANIMATION_DURATION);
      return () => clearTimeout(t);
    }
  }, [isVisible, shouldRender]);

  useEffect(() => {
    if (!shouldRender) return;

    const handleKeydown = (event) => {
      const secret =
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "x";

      if (secret) {
        setAdminKeyCount((c) => {
          const n = c + 1;
          if (n === 5) {
            if (onAdminRedirect) onAdminRedirect();
            else window.open("/admin-entry", "_blank");
            return 0;
          }
          return n;
        });
      }
    };

    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [shouldRender, onAdminRedirect]);

  if (!shouldRender) return null;

  return (
    <div
      className={`modal-overlay ${isClosing ? "closing" : ""}`}
      onClick={handleClose}
    >
      <div
        className={`auth-card ${isClosing ? "closing" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close-button" onClick={handleClose}>
          ×
        </button>

        {/* FIX: FORM INLINE — NO REMOUNTING */}
        <form
          className="auth-form"
          onSubmit={
            authMode === "login" ? handleLoginSubmit : handleSignupSubmit
          }
        >
          <h2>{authMode === "login" ? "Log In" : "Sign Up"}</h2>

          {authMode === "signup" && (
            <>
              <p className="note">Customers only. Staff handled by admin.</p>

              <label>Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </>
          )}

          <label>Email</label>
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {authMode === "signup" && (
            <>
              <label>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </>
          )}

          <button type="submit" className="submit-button">
            {authMode === "login" ? "Log In" : "Sign Up"}
          </button>
        </form>

        <div className="switch-auth-mode">
          {authMode === "login" ? (
            <>
              New user?
              <button onClick={() => setAuthMode("signup")}>
                Create account
              </button>
            </>
          ) : (
            <>
              Already have an account?
              <button onClick={() => setAuthMode("login")}>Log In</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
