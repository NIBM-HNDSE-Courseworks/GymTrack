// RFIDTracker.js
import React, { useState, useEffect } from "react";
import "./RFIDTracker.css";
import { db } from "../Firebase";
import { ref, onValue, get } from "firebase/database"; // <span style="color:orange">Import 'get' for one-time read</span>

// Define capacity thresholds for visual representation
const MAX_CAPACITY_ALERT = 3;
const HIGH_CAPACITY_WARNING = 2;

// --- <span style="color:orange">NEW: Customer Inside Status Component</span> ---
function CustomerInsideStatus() {
  // State to store the list of customers and their 'inside' status
  const [customers, setCustomers] = useState([]);
  // <span style="color:orange">State to hold the static customer mapping data</span>
  const [customerMap, setCustomerMap] = useState({});
  // <span style="color:orange">State to track if the initial load is complete</span>
  const [isLoading, setIsLoading] = useState(true);

  // <span style="color:white">1. Fetch Customer Names (One-time read from 'customers' node)</span>
  useEffect(() => {
    const customersRef = ref(db, "customers");

    // Use 'get' for a one-time read since customer names don't change often
    get(customersRef)
      .then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const map = {};
          // Map the UID to the customer name for easy lookup
          Object.values(data).forEach((customer) => {
            map[customer.uid] = customer.name;
          });
          setCustomerMap(map);
        }
      })
      .catch((error) => {
        console.error("Error fetching customer data:", error);
      });
  }, []); // Empty dependency array ensures this runs only once

  // <span style="color:white">2. Listen to Real-Time 'users' data and merge with names</span>
  useEffect(() => {
    if (Object.keys(customerMap).length === 0) return; // Wait until customerMap is loaded

    const usersRef = ref(db, "users");

    // onValue runs every time the data at /users changes
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const usersData = snapshot.val();
      if (!usersData) {
        setCustomers([]);
        setIsLoading(false);
        return;
      }

      const customerList = Object.entries(usersData)
        .map(([cardId, userData]) => {
          // <span style="color:orange">Use the UID from 'users' to look up the name in customerMap</span>
          const customerName = customerMap[userData.uid];

          // <span style="color:red">NEW: Filter out unregistered cardholders (where customerName is undefined)</span>
          if (!customerName) {
            return null;
          }

          return {
            name: customerName,
            inside: userData.inside || 0, // 1 for inside, 0 for outside
            cardId: cardId,
          };
        })
        .filter((customer) => customer !== null); // <span style="color:red">Remove null entries (unregistered cards)</span>

      // Sort: Inside customers (green dot) first, then outside (red dot)
      customerList.sort((a, b) => b.inside - a.inside);

      setCustomers(customerList);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [customerMap]); // Rerun when the customerMap is ready

  // <span style="color:white">Layout: Creates two columns (left/right) based on customer index.</span>
  const leftColumn = customers.filter((_, index) => index % 2 === 0);
  const rightColumn = customers.filter((_, index) => index % 2 !== 0);

  // <span style="color:red">NEW: Render Empty/Loading State</span>
  const renderContent = () => {
    if (isLoading) {
      return (
        <p style={{ color: "white", opacity: 0.7, textAlign: "center" }}>
          Loading member data...
        </p>
      );
    }

    if (customers.length === 0) {
      return (
        <p
          style={{
            color: "orange",
            opacity: 0.9,
            textAlign: "center",
            padding: "10px 0",
          }}
        >
          No registered members tracked by RFID cards currently.
        </p>
      );
    }

    return (
      <div className="customer-grid">
        <div className="customer-column">
          {leftColumn.map((customer, index) => (
            <div key={customer.cardId || index} className="customer-item">
              <div
                className={`status-dot ${
                  customer.inside === 1 ? "dot-green" : "dot-red"
                }`}
              ></div>
              <span style={{ color: "white" }}>{customer.name}</span>
            </div>
          ))}
        </div>
        <div className="customer-column">
          {rightColumn.map((customer, index) => (
            <div key={customer.cardId || index} className="customer-item">
              <div
                className={`status-dot ${
                  customer.inside === 1 ? "dot-green" : "dot-red"
                }`}
              ></div>
              <span style={{ color: "white" }}>{customer.name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="tracker-card customer-status-card">
      <h2 style={{ color: "orange" }}>👤 Members Inside Status</h2>
      {renderContent()}
    </div>
  );
}
// --- <span style="color:orange">END NEW Component</span> ---

function RFIDTracker() {
  // <span style="color:orange">State to store the real-time count of users inside</span>
  const [currentUsers, setCurrentUsers] = useState(0);

  // <span style="color:white">Database Listener for Real-Time Capacity</span>
  useEffect(() => {
    // <span style="color:white">Listen to the root 'users' node, which contains card IDs.</span>
    const usersRef = ref(db, "users");

    // <span style="color:white">onValue will run every time the data at /users changes</span>
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const usersData = snapshot.val();
      if (!usersData) {
        setCurrentUsers(0);
        return;
      }

      let insideCount = 0;
      // <span style="color:white">Iterate through all user/card entries</span>
      Object.values(usersData).forEach((userData) => {
        // <span style="color:white">The Arduino code sets 'inside: 1' for entry and 'inside: 0' for exit.</span>
        if (userData && userData.inside === 1) {
          insideCount += 1;
        }
      });

      // <span style="color:white">Update the state with the total count of users currently inside</span>
      setCurrentUsers(insideCount);
    });

    // <span style="color:white">Cleanup listener on component unmount</span>
    return () => unsubscribe();
  }, []);

  // <span style="color:white">Determine indicator color based on current capacity</span>
  const indicatorColor = (() => {
    if (currentUsers >= MAX_CAPACITY_ALERT) {
      return "#d9534f"; // Red for danger/max limit exceeded
    }
    if (currentUsers >= HIGH_CAPACITY_WARNING) {
      return "#f0ad4e"; // Orange/Yellow for high capacity warning
    }
    return "#5cb85c"; // Green for safe capacity
  })();

  const statusText = (() => {
    if (currentUsers >= MAX_CAPACITY_ALERT) return "MAX CAPACITY REACHED!";
    if (currentUsers >= HIGH_CAPACITY_WARNING) return "Crowded";
    if (currentUsers > 0) return "Optimal";
    return "Empty";
  })();

  return (
    <>
      <div className="tracker-card capacity-card">
        <h2>👤 Gym Capacity (Crowdedness)</h2>
        <div
          className="status-indicator capacity-indicator"
          style={{ backgroundColor: indicatorColor }}
        >
          <span
            style={{ color: "white", fontSize: "1.5em", fontWeight: "bold" }}
          >
            {statusText}
          </span>
        </div>

        {/* <span style="color:orange">Display the real-time user count beautifully</span> */}
        <div className="capacity-display">
          <p
            style={{ color: "orange", fontSize: "1.2em", marginBottom: "5px" }}
          >
            Current Members Inside:
          </p>
          <div style={{ color: "white", fontSize: "4em", fontWeight: "900" }}>
            {currentUsers}
          </div>
          <p style={{ color: "white", opacity: 0.7, marginTop: "5px" }}>
            Tracking up to {MAX_CAPACITY_ALERT} for alert.
          </p>
        </div>

        {/* <span style="color:white">Removed Simulation Buttons</span> */}
      </div>

      {/* <span style="color:orange">NEW: Customer Status Component is placed right below the capacity card</span> */}
      <CustomerInsideStatus />
    </>
  );
}

export default RFIDTracker;
