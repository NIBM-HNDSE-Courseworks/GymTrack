import React, { useState, useEffect } from "react";
// Import Realtime Database functions
import { getDatabase, ref, onValue } from "firebase/database";
import { initializeApp } from "firebase/app";

// Your web app's Firebase configuration (using the config you provided)
// NOTE: We assume these values are provided by the canvas environment for simplicity,
// but we include them here for a complete, runnable file.
const firebaseConfig = {
  apiKey: "AIzaSyDqzB125_DD0slXXpaBfVBgKoGgRNO5LM0",
  authDomain: "smartgymtracker-4123b.firebaseapp.com",
  databaseURL: "https://smartgymtracker-4123b-default-rtdb.firebaseio.com",
  projectId: "smartgymtracker-4123b",
  storageBucket: "smartgymtracker-4123b.firebasestorage.app",
  messagingSenderId: "704061624974",
  appId: "1:704061624974:web:9341b391a4df198f492fdf",
  measurementId: "G-KSV8CNB599",
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// The path where the ESP8266 is sending data (BLK-001)
const EQUIPMENT_PATH = "equipment_data/BLK-001";

function App() {
  // State to hold the current equipment data
  const [equipmentData, setEquipmentData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Set up the real-time listener to Firebase
  useEffect(() => {
    // Reference to the specific equipment path
    const equipmentRef = ref(db, EQUIPMENT_PATH);

    // Attach a listener to read data in real-time
    const unsubscribe = onValue(
      equipmentRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          setEquipmentData(data);
        } else {
          // Handle case where data might not exist yet
          setEquipmentData({
            equipment_name: "Blinking Status Simulator",
            status: "OFFLINE",
            error: "No data found at path.",
          });
        }
        setIsLoading(false);
      },
      (error) => {
        console.error("Firebase Read Failed:", error);
        setEquipmentData({
          equipment_name: "Blinking Status Simulator",
          status: "ERROR",
          error: error.message,
        });
        setIsLoading(false);
      }
    );

    // Cleanup function to detach the listener when the component unmounts
    return () => unsubscribe();
  }, []);

  // Determine styling based on the status reported by the ESP8266
  const status = equipmentData?.status || "LOADING";
  let statusColor = "";
  let statusText = status.toUpperCase();

  switch (statusText) {
    case "FREE":
      statusColor = "bg-green-600 shadow-green-400/50";
      break;
    case "IN USE":
      statusColor = "bg-red-600 shadow-red-400/50";
      break;
    case "LOADING":
    case "OFFLINE":
      statusColor = "bg-gray-500 shadow-gray-400/50 animate-pulse";
      statusText = isLoading ? "CONNECTING..." : "OFFLINE";
      break;
    case "ERROR":
      statusColor = "bg-yellow-700 shadow-yellow-500/50";
      break;
    default:
      statusColor = "bg-blue-600 shadow-blue-400/50";
  }

  // Custom class for pulse effect when IN USE
  const pulseClass = statusText === "IN USE" ? "ring-4 ring-red-500/50" : "";

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 font-sans antialiased">
      {/* Main Status Card */}
      <div className="w-full max-w-md bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-700">
        <div className="flex items-center justify-center mb-6">
          {/* Simple Dumbbell Icon using SVG */}
          <svg
            className="w-8 h-8 text-white mr-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM12 4a8 8 0 100 16 8 8 0 000-16zM15 12a3 3 0 11-6 0 3 3 0 016 0z"
            ></path>
          </svg>
          <h1 className="text-3xl font-extrabold text-white">
            Gym Equipment Status
          </h1>
        </div>

        <p className="text-gray-400 text-center mb-8 border-b border-gray-700 pb-4">
          Monitoring{" "}
          <span className="text-white font-mono">
            {equipmentData?.equipment_name || "BLK-001"}
          </span>{" "}
          in real-time.
        </p>

        {/* Status Indicator Circle and Text */}
        <div className="flex flex-col items-center justify-center space-y-6">
          <div
            className={`w-40 h-40 rounded-full flex items-center justify-center text-white 
                        font-extrabold text-3xl shadow-xl transition-all duration-300 ease-in-out 
                        border-4 border-gray-700 transform hover:scale-105 
                        ${statusColor} ${pulseClass}`}
          >
            {statusText}
          </div>

          <p className="text-lg text-gray-300">
            Last Update:
            <span className="font-semibold text-white ml-2">
              {equipmentData?.timestamp
                ? new Date(equipmentData.timestamp).toLocaleTimeString()
                : "N/A"}
            </span>
          </p>
        </div>

        {/* Raw Data Display */}
        {equipmentData?.raw_data && (
          <div className="mt-8 pt-4 border-t border-gray-700">
            <h2 className="text-xl font-semibold text-gray-300 mb-3">
              Raw Data from ESP8266
            </h2>
            <div className="space-y-2 text-gray-400 text-sm">
              <p className="flex justify-between items-center">
                <span className="font-medium text-white">Device ID:</span>
                <span className="font-mono text-right">
                  {equipmentData.equipment_id}
                </span>
              </p>
              <p className="flex justify-between items-center">
                <span className="font-medium text-white">
                  Simulated IN USE:
                </span>
                <span
                  className={`font-mono text-right ${
                    equipmentData.raw_data.is_blinking
                      ? "text-red-400"
                      : "text-green-400"
                  }`}
                >
                  {equipmentData.raw_data.is_blinking ? "True" : "False"}
                </span>
              </p>
              <p className="flex justify-between items-center">
                <span className="font-medium text-white">Raw LED State:</span>
                <span className="font-mono text-right">
                  {equipmentData.raw_data.raw_led_state}
                </span>
              </p>
            </div>
          </div>
        )}

        {/* Error/Offline Display */}
        {equipmentData?.error && (
          <div className="mt-4 p-3 bg-yellow-900/50 border border-yellow-600 rounded text-sm text-yellow-300">
            <p className="font-bold">Connection Message:</p>
            <p className="font-mono">{equipmentData.error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
