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

      const userRef = ref(db, `users/${cardID}`);
      const userSnap = await get(userRef);

      // New user → show modal
      if (!userSnap.exists() || !userSnap.val().registered) {
        return setNewCard(cardID);
      }

      // Existing user → toggle inside
      const inside = userSnap.val().inside || 0;
      await set(ref(db, `users/${cardID}/inside`), inside === 0 ? 1 : 0);
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

      {/* NEW USER POPUP */}
      {userRole === "staff" && newCard && (
        <AddRFIDModal
          cardID={newCard}
          onClose={() => setNewCard(null)}
          onAdd={() => setNewCard(null)}
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
