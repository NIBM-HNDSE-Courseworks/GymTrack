// RFIDCapacity.js
import React, { useState, useEffect } from "react";
import "./RFIDTracker.css";
import { db } from "../Firebase";
import { ref, onValue, get } from "firebase/database";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const MAX_CAPACITY_ALERT = 3;
const HIGH_CAPACITY_WARNING = 2;

// ----------------- Customer Inside Status -----------------
function CustomerInsideStatus() {
  const [customers, setCustomers] = useState([]);
  const [customerMap, setCustomerMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  const [logData, setLogData] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");

  // Fetch Customer Names once
  useEffect(() => {
    const customersRef = ref(db, "customers");
    get(customersRef)
      .then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const map = {};
          Object.values(data).forEach((customer) => {
            map[customer.uid] = customer.name;
          });
          setCustomerMap(map);
        }
      })
      .catch(console.error);
  }, []);

  // Listen to /users
  useEffect(() => {
    if (Object.keys(customerMap).length === 0) return;
    const usersRef = ref(db, "users");
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const usersData = snapshot.val();
      if (!usersData) {
        setCustomers([]);
        setIsLoading(false);
        return;
      }
      const customerList = Object.entries(usersData)
        .map(([cardId, userData]) => {
          const customerName = customerMap[userData.uid];
          if (!customerName) return null;
          return {
            name: customerName,
            inside: userData.inside || 0,
            cardId: cardId,
          };
        })
        .filter((c) => c !== null)
        .sort((a, b) => b.inside - a.inside);

      setCustomers(customerList);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [customerMap]);

  // Fetch logs for graph
  useEffect(() => {
    const logsRef = ref(db, "users_in_out_log");
    const unsubscribe = onValue(logsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setLogData([]);
        return;
      }
      const logsArray = Object.values(data).map((entry) => ({
        ...entry,
        date: entry.timestamp.split("T")[0], // YYYY-MM-DD
        hour: parseInt(entry.timestamp.split("T")[1].split(":")[0]), // HH
      }));
      setLogData(logsArray);
      if (!selectedDate && logsArray.length > 0) {
        setSelectedDate(logsArray[logsArray.length - 1].date);
      }
    });
    return () => unsubscribe();
  }, [selectedDate]);

  // Prepare chart data (1 scan per user per hour)
  const chartData = Array.from({ length: 24 }, (_, i) => {
    const usersSeen = new Set();
    logData.forEach((entry) => {
      if (
        entry.date === selectedDate &&
        entry.hour === i &&
        entry.action === "in"
      ) {
        usersSeen.add(entry.customerUID);
      }
    });
    return { hour: `${i}:00`, count: usersSeen.size };
  });

  const leftColumn = customers.filter((_, index) => index % 2 === 0);
  const rightColumn = customers.filter((_, index) => index % 2 !== 0);

  const renderContent = () => {
    if (isLoading)
      return (
        <p style={{ color: "white", opacity: 0.7, textAlign: "center" }}>
          Loading member data...
        </p>
      );
    if (customers.length === 0)
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

    return (
      <>
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

        {/* ----- Peak Hours Chart ----- */}
        <div style={{ marginTop: "35px" }}>
          <h3 style={{ color: "orange", marginBottom: "15px" }}>
            📊 Peak Hours
          </h3>
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              marginBottom: "20px",
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid #FFA500",
              backgroundColor: "#1f2937",
              color: "#fff",
              fontWeight: "bold",
              fontSize: "0.95em",
            }}
          >
            {[...new Set(logData.map((log) => log.date))].map((date) => (
              <option key={date} value={date}>
                {date}
              </option>
            ))}
          </select>

          {/* Expanded chart width */}
          <ResponsiveContainer width="250%" height={350}>
            <AreaChart
              data={chartData}
              margin={{ top: 15, right: 0, left: 0, bottom: 5 }}
            >
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FFA500" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#FFA500" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="hour" stroke="#fff" />
              <YAxis allowDecimals={false} stroke="#fff" />
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#111827",
                  border: "none",
                  color: "#fff",
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#FFA500"
                fillOpacity={1}
                fill="url(#colorCount)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </>
    );
  };

  return (
    <div className="tracker-card customer-status-card">
      <h2 style={{ color: "orange" }}>👤 Members Inside Status</h2>
      {renderContent()}
    </div>
  );
}

// ----------------- Main RFID Tracker -----------------
function RFIDTracker() {
  const [currentUsers, setCurrentUsers] = useState(0);

  useEffect(() => {
    const usersRef = ref(db, "users");
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const usersData = snapshot.val();
      if (!usersData) {
        setCurrentUsers(0);
        return;
      }
      let insideCount = 0;
      Object.values(usersData).forEach((userData) => {
        if (userData && userData.inside === 1) insideCount += 1;
      });
      setCurrentUsers(insideCount);
    });
    return () => unsubscribe();
  }, []);

  const indicatorColor =
    currentUsers >= MAX_CAPACITY_ALERT
      ? "#d9534f"
      : currentUsers >= HIGH_CAPACITY_WARNING
      ? "#f0ad4e"
      : "#5cb85c";

  const statusText =
    currentUsers >= MAX_CAPACITY_ALERT
      ? "MAX CAPACITY REACHED!"
      : currentUsers >= HIGH_CAPACITY_WARNING
      ? "Crowded"
      : currentUsers > 0
      ? "Optimal"
      : "Empty";

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
      </div>

      <CustomerInsideStatus />
    </>
  );
}

export default RFIDTracker;
