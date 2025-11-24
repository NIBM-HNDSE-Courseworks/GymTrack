// App.js
import React, { useState, useEffect } from "react";
import "./App.css";

import UltrasonicTracker from "./components/UltrasonicTracker";
import CurrentSensorTracker from "./components/CurrentSensorTracker";
import LoadCellTracker from "./components/LoadCellTracker";
import RFIDEquipment from "./components/RFIDEquipment";
import RFIDCapacity from "./components/RFIDCapacity";
import AddRFIDModal from "./components/AddRFIDModal";
import AddRFIDEquipmentModal from "./components/AddRFIDEquipmentModal";

import LoginButton from "./components/LoginButton";
import AuthModal from "./components/AuthModal";
import AdminEntry from "./components/AdminEntry";
import AdminDashboard from "./components/AdminDashboard";

import { auth, db } from "./Firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { ref, get, onValue } from "firebase/database";

import CrowdedSummaryCard from "./components/CrowdedSummaryCard";

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRoute, setCurrentRoute] = useState("dashboard");
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);

  const [openRFIDModal, setOpenRFIDModal] = useState(false);
  const [openRFIDEquipmentModal, setOpenRFIDEquipmentModal] = useState(false);
  const [lastScannedCard, setLastScannedCard] = useState(null);
  const [adminLoggedOut, setAdminLoggedOut] = useState(false);

  // ---------------- AUTH ----------------
  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUser(null);
        setUserRole(null);
        return;
      }

      setUser(user);

      let snap = await get(ref(db, `customers/${user.uid}`));
      if (snap.exists()) return setUserRole(snap.val().role);

      snap = await get(ref(db, `staff_users/${user.uid}`));
      setUserRole(snap.exists() ? snap.val().role : null);
    });
  }, []);

  // ---------------- RFID LISTENER ----------------
  useEffect(() => {
    const cardRef = ref(db, "last_scanned_card");
    return onValue(cardRef, (snap) => {
      const id = snap.val();
      if (id) setLastScannedCard(id);
    });
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setUserRole(null);
    setCurrentRoute("dashboard");
  };

  const handleAdminLogout = () => {
    setCurrentRoute("dashboard");
    setAdminLoggedOut(true);
  };

  const renderEmptyDashboard = () => (
    <div className="empty-hero">
      <div className="empty-hero-overlay">
        <h1>Welcome to GymTrack</h1>
        <p>Your smart gym companion for real-time activity tracking.</p>

        <div className="empty-hero-hint">
          <span className="empty-hint-text">
            Use the Login button above to get started
          </span>

          <div className="empty-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </div>
  );

  // ---------------- MAIN UI ----------------
  const renderDashboardContent = () => {
    if (!userRole) return renderEmptyDashboard();

    // CUSTOMER VIEW
    if (userRole === "customer") {
      return (
        <div className="dashboard-layout">
          {/* LEFT SIDE */}
          <div className="left-panel">
            <RFIDCapacity userRole={userRole} />
          </div>

          {/* RIGHT SIDE (ALL EQUAL HEIGHT) */}
          <div className="right-panel">
            <div className="equal-card-wrap">
              <CrowdedSummaryCard />
            </div>

            <div className="equal-card-wrap">
              <UltrasonicTracker equipmentId="SQT01" initialStatus="FREE" />
            </div>

            <div className="equal-card-wrap">
              <CurrentSensorTracker equipmentId="TRD01" initialStatus="FREE" />
            </div>

            <div className="equal-card-wrap">
              <LoadCellTracker equipmentId="DMR05" />
            </div>
          </div>
        </div>
      );
    }

    // STAFF VIEW — left: peak graph, right: equipment + buttons
    if (userRole === "staff") {
      return (
        <div className="dashboard-layout">
          {/* LEFT SIDE */}
          <div className="left-panel">
            <RFIDCapacity userRole={userRole} />
          </div>

          {/* RIGHT SIDE */}
          <div className="right-panel">
            <RFIDEquipment />

            <div className="staff-controls">
              <button
                onClick={() => setOpenRFIDModal(true)}
                className="staff-btn blue"
              >
                Open RFID Connect
              </button>

              <button
                onClick={() => setOpenRFIDEquipmentModal(true)}
                className="staff-btn green"
              >
                Open RFID Equipment Connect
              </button>
            </div>
          </div>
        </div>
      );
    }

    return renderEmptyDashboard();
  };

  const isLoggedInUser = user && currentRoute !== "admin-dashboard";
  const isLoggedInAdmin = currentRoute === "admin-dashboard";

  return (
    <div className="App">
      {/* HEADER */}
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
            <button onClick={handleLogout} className="logout-btn">
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

      {/* RFID MODALS */}
      {userRole === "staff" && openRFIDModal && (
        <AddRFIDModal
          cardID={lastScannedCard}
          onClose={() => setOpenRFIDModal(false)}
          onConnect={() => setOpenRFIDModal(false)}
        />
      )}

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
