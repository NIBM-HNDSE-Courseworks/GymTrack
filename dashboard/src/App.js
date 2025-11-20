// src/App.js
import React, { useState, useEffect } from "react";
import "./App.css";

// Components
import UltrasonicTracker from "./components/UltrasonicTracker";
import CurrentSensorTracker from "./components/CurrentSensorTracker";
import LoadCellTracker from "./components/LoadCellTracker";
import RFIDEquipment from "./components/RFIDEquipment";
import RFIDCapacity from "./components/RFIDCapacity";

// Auth Components
import LoginButton from "./components/LoginButton";
import AuthModal from "./components/AuthModal";

// Admin Components
import AdminEntry from "./components/AdminEntry";
import AdminDashboard from "./components/AdminDashboard";

// Firebase
import { auth, db } from "./Firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { ref, get } from "firebase/database";

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRoute, setCurrentRoute] = useState("dashboard");
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        // First check customers
        let snapshot = await get(ref(db, `customers/${currentUser.uid}`));
        let data = snapshot.val();

        if (data?.role) {
          setUserRole(data.role); // "customer"
        } else {
          // Check staff_users if not found in customers
          snapshot = await get(ref(db, `staff_users/${currentUser.uid}`));
          data = snapshot.val();
          if (data?.role) setUserRole(data.role); // "staff"
          else setUserRole(null);
        }
      } else {
        setUser(null);
        setUserRole(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAdminRedirect = () => {
    setIsModalOpen(false);
    setCurrentRoute("admin-entry");
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setUserRole(null);
    setCurrentRoute("dashboard");
  };

  const renderContent = () => {
    if (currentRoute === "admin-entry") {
      return (
        <AdminEntry
          onLoginSuccess={() => setCurrentRoute("staff-dashboard")}
          onClose={() => setCurrentRoute("dashboard")}
        />
      );
    }

    if (currentRoute === "staff-dashboard") {
      return <AdminDashboard onLogout={handleLogout} />;
    }

    return (
      <div className="dashboard-wrapper">
        <header className="App-header-title">
          <div className="header-content">
            <h1>GymTrack Dashboard 📊</h1>
            <p>
              Welcome to GymTrack! Monitor gym equipment and crowdedness in
              real-time. Stay safe and track efficiently.
            </p>
          </div>
          {user ? (
            <button className="logout-button" onClick={handleLogout}>
              Logout
            </button>
          ) : (
            <LoginButton onClick={() => setIsModalOpen(true)} />
          )}
        </header>

        {user && (
          <div className="dashboard-grid">
            {userRole === "staff" && <RFIDEquipment />}
            <RFIDCapacity /> {/* Both staff & customer see capacity */}
            {userRole === "customer" && (
              <>
                <UltrasonicTracker equipmentId="SQT01" initialStatus="FREE" />
                <CurrentSensorTracker
                  equipmentId="TRD01"
                  initialStatus="FREE"
                />
                <LoadCellTracker equipmentId="DMR05" />
              </>
            )}
          </div>
        )}

        {userRole === "customer" && user && (
          <div className="footer-note">
            <p>Data is transmitted as JSON via MQTT/HTTP by the ESP8266.</p>
            <p>Monitor gym crowdedness and equipment availability live! 🏋️‍♂️</p>
          </div>
        )}

        {!user && (
          <div className="home-description">
            <p>
              Welcome to GymTrack! 📊 <br />
              Please login to see live gym equipment tracking and crowdedness.
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="App">
      {renderContent()}

      <AuthModal
        isVisible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdminRedirect={handleAdminRedirect}
      />
    </div>
  );
}

export default App;
