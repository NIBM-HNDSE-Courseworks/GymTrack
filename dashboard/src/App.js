// src/App.js
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

  const [newCard, setNewCard] = useState(null);

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

  // RFID CARD LISTENER
  useEffect(() => {
    const cardRef = ref(db, "last_scanned_card");

    return onValue(cardRef, async (snap) => {
      const cardID = snap.val();
      if (!cardID) return;

      // Check users/<cardID>/uid - if not present or empty => newCard (unassigned)
      const userRef = ref(db, `users/${cardID}`);
      const userSnap = await get(userRef);

      if (!userSnap.exists() || !userSnap.val().uid) {
        // Unassigned card detected -> open User Connect modal and pass cardID
        return setNewCard(cardID);
      }

      // Card assigned -> toggle inside (existing behaviour)
      const inside = userSnap.val().inside || 0;
      await set(ref(db, `users/${cardID}/inside`), inside === 0 ? 1 : 0);

      // clear any modal/newCard state
      setNewCard(null);
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
          {userRole === "staff" && <RFIDEquipment />}
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

      {/* USER CONNECT (formerly AddRFIDModal) */}
      {userRole === "staff" && newCard && (
        <AddRFIDModal
          cardID={newCard}
          onClose={() => setNewCard(null)}
          onConnect={() => setNewCard(null)}
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
