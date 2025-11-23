import React, { useState, useEffect } from "react";
import "./App.css";

// <span style="color:white">Component Imports (unchanged)</span>
import UltrasonicTracker from "./components/UltrasonicTracker";
import CurrentSensorTracker from "./components/CurrentSensorTracker";
import LoadCellTracker from "./components/LoadCellTracker";
import RFIDEquipment from "./components/RFIDEquipment";
import RFIDCapacity from "./components/RFIDCapacity";
import AddRFIDModal from "./components/AddRFIDModal";
import AddRFIDEquipmentModal from "./components/AddRFIDEquipmentModal";   // ⭐ NEW IMPORT

import LoginButton from "./components/LoginButton";
import AuthModal from "./components/AuthModal";
import AdminEntry from "./components/AdminEntry";
import AdminDashboard from "./components/AdminDashboard";

import { auth, db } from "./Firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { ref, get, onValue } from "firebase/database";

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRoute, setCurrentRoute] = useState("dashboard");
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);

  const [openRFIDModal, setOpenRFIDModal] = useState(false);
  const [openRFIDEquipmentModal, setOpenRFIDEquipmentModal] = useState(false); // ⭐ NEW STATE
  const [lastScannedCard, setLastScannedCard] = useState(null);

  // NEW: Prevent auto-login loop for admin
  const [adminLoggedOut, setAdminLoggedOut] = useState(false);

  // AUTH LISTENER
  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUser(null);
        setUserRole(null);
        return;
      }

      setUser(user);

      // <span style="color:white">FETCH ROLE LOGIC</span>
      let snap = await get(ref(db, `customers/${user.uid}`));
      if (snap.exists()) return setUserRole(snap.val().role);

      snap = await get(ref(db, `staff_users/${user.uid}`));
      setUserRole(snap.exists() ? snap.val().role : null);
    });
  }, []);

  // RFID CARD LISTENER
  useEffect(() => {
    const cardRef = ref(db, "last_scanned_card");
    return onValue(cardRef, (snap) => {
      const cardID = snap.val();
      if (!cardID) return;
      setLastScannedCard(cardID);
    });
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setUserRole(null);
    setCurrentRoute("dashboard");
  };

  // FIXED: Admin logout now sets a flag
  const handleAdminLogout = () => {
    setCurrentRoute("dashboard"); // go back to home
    setAdminLoggedOut(true); // prevent auto-login
  };

  const renderDashboardContent = () => {
    // <span style="color:white">Only show content if user is logged in AND has a role</span>
    if (userRole === "customer") {
      return (
        <>
          <UltrasonicTracker equipmentId="SQT01" initialStatus="FREE" />
          <CurrentSensorTracker equipmentId="TRD01" initialStatus="FREE" />
          <LoadCellTracker equipmentId="DMR05" />
          <RFIDCapacity />
        </>
      );
    }

    if (userRole === "staff") {
      return (
        <>
          <RFIDCapacity />
          <RFIDEquipment />
          <div className="staff-controls">
            <button
              onClick={() => setOpenRFIDModal(true)}
              style={{
                padding: "10px",
                width: "100%",
                background: "#4e8cff",
                color: "white",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Open RFID Connect
            </button>

            {/* ⭐ NEW BUTTON FOR EQUIPMENT RFID ASSIGNMENT */}
            <button
              onClick={() => setOpenRFIDEquipmentModal(true)}
              style={{
                padding: "10px",
                width: "100%",
                background: "#00b35a",
                color: "white",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                fontWeight: "bold",
                marginTop: "10px",
              }}
            >
              Open RFID Equipment Connect
            </button>
          </div>
        </>
      );
    }

    // <span style="color:white">Default view when not logged in (or role not loaded)</span>
    return (
      <div className="welcome-panel">
        <h2>Welcome to GymTrack Dashboard</h2>
        <p>Please log in to view your personalized tracking data.</p>
      </div>
    );
  };

  // <span style="color:white">Logic remains the same for display purposes</span>
  const isLoggedInUser = user && currentRoute !== "admin-dashboard";
  const isLoggedInAdmin = currentRoute === "admin-dashboard";

  return (
    <div className="App">
      <header className="App-header-title">
        <div style={{ display: "flex", alignItems: "center" }}>
          <h1>GymTrack Dashboard || </h1>
          {isLoggedInUser && (
            <p style={{ marginLeft: 20, color: "orange", fontWeight: "bold" }}>
              Logged in as:{" "}
              <span style={{ color: "white" }}>
                {user.displayName || user.email}
              </span>
            </p>
          )}
          {isLoggedInAdmin && (
            <p style={{ marginLeft: 20, color: "orange", fontWeight: "bold" }}>
              Logged in as: <span style={{ color: "white" }}>Admin</span>
            </p>
          )}
        </div>

        <div className="header-actions">
          {!user && currentRoute !== "admin-dashboard" && (
            <LoginButton onClick={() => setIsModalOpen(true)} />
          )}
          {isLoggedInUser && (
            <button
              onClick={handleLogout}
              style={{
                padding: "8px 15px",
                background: "#f85149",
                color: "white",
                borderRadius: 4,
                border: "none",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Logout
            </button>
          )}
        </div>
      </header>

      {currentRoute === "dashboard" && (
        <div className="dashboard-grid">{renderDashboardContent()}</div>
      )}

      {currentRoute === "admin-entry" && !adminLoggedOut && (
        <AdminEntry
          onLogin={() => setCurrentRoute("admin-dashboard")}
          onBack={() => setCurrentRoute("dashboard")}
        />
      )}

      {currentRoute === "admin-dashboard" && (
        <AdminDashboard onLogout={handleAdminLogout} />
      )}

      {/* EXISTING CUSTOMER-RFID CONNECT MODAL */}
      {userRole === "staff" && openRFIDModal && (
        <AddRFIDModal
          cardID={lastScannedCard}
          onClose={() => setOpenRFIDModal(false)}
          onConnect={() => setOpenRFIDModal(false)}
        />
      )}

      {/* ⭐ NEW EQUIPMENT-RFID CONNECT MODAL */}
      {userRole === "staff" && openRFIDEquipmentModal && (
        <AddRFIDEquipmentModal
          cardID={lastScannedCard}
          onClose={() => setOpenRFIDEquipmentModal(false)}
          onConnect={() => setOpenRFIDEquipmentModal(false)}
        />
      )}

      <AuthModal
        isVisible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdminRedirect={() => setCurrentRoute("admin-entry")}
      />
    </div>
  );
}

export default App;
