import React, { useState, useEffect } from "react";
import "./App.css";

import UltrasonicTracker from "./components/UltrasonicTracker";
import CurrentSensorTracker from "./components/CurrentSensorTracker";
import LoadCellTracker from "./components/LoadCellTracker";
import RFIDEquipment from "./components/RFIDEquipment";
import RFIDCapacity from "./components/RFIDCapacity";
import AddRFIDModal from "./components/AddRFIDModal";

import LoginButton from "./components/LoginButton";
import AuthModal from "./components/AuthModal";
import AdminEntry from "./components/AdminEntry";
import AdminDashboard from "./components/AdminDashboard";

import { auth, db } from "./Firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { ref, get, onValue, set } from "firebase/database";

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRoute, setCurrentRoute] = useState("dashboard");
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);

  const [openRFIDModal, setOpenRFIDModal] = useState(false);
  const [lastScannedCard, setLastScannedCard] = useState(null);

  // AUTH LISTENER
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

  // RFID CARD LISTENER (no modal open here)
  useEffect(() => {
    const cardRef = ref(db, "last_scanned_card");

    return onValue(cardRef, async (snap) => {
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

  return (
    <div className="App">
      <header className="App-header-title">
        <h1>GymTrack Dashboard 📊</h1>

        {user && <p>Logged in as: {user.displayName || user.email}</p>}

        {!user && <LoginButton onClick={() => setIsModalOpen(true)} />}
        {user && <button onClick={handleLogout}>Logout</button>}
      </header>

      {user && (
        <div className="dashboard-grid">
          {userRole === "staff" && (
            <>
              <RFIDEquipment />

              {/* 🔵 BUTTON TO OPEN MODAL */}
              <button
                onClick={() => setOpenRFIDModal(true)}
                style={{
                  padding: "10px",
                  marginBottom: "15px",
                  background: "#4e8cff",
                  color: "white",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Open RFID Connect
              </button>
            </>
          )}

          <RFIDCapacity />

          {userRole === "customer" && (
            <>
              <UltrasonicTracker equipmentId="SQT01" initialStatus="FREE" />
              <CurrentSensorTracker equipmentId="TRD01" initialStatus="FREE" />
              <LoadCellTracker equipmentId="DMR05" />
            </>
          )}
        </div>
      )}

      {/* MODAL ONLY OPENS WHEN BUTTON IS CLICKED */}
      {userRole === "staff" && openRFIDModal && (
        <AddRFIDModal
          cardID={lastScannedCard}
          onClose={() => setOpenRFIDModal(false)}
          onConnect={() => setOpenRFIDModal(false)}
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
