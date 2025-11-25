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
function CustomerInsideStatus({ userRole }) {
  const [customers, setCustomers] = useState([]);
  const [customerMap, setCustomerMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  const [logData, setLogData] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");

  // NEW STATE FOR POPUP
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupHour, setPopupHour] = useState(null);
  const [popupList, setPopupList] = useState([]);

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
        date: entry.timestamp.split("T")[0],
        hour: parseInt(entry.timestamp.split("T")[1].split(":")[0]),
      }));

      setLogData(logsArray);

      if (!selectedDate && logsArray.length > 0) {
        setSelectedDate(logsArray[logsArray.length - 1].date);
      }
    });
    return () => unsubscribe();
  }, [selectedDate]);

  // Prepare chart data
  const chartData = Array.from({ length: 24 }, (_, hr) => {
    const seen = new Set();
    logData.forEach((entry) => {
      if (
        entry.date === selectedDate &&
        entry.hour === hr &&
        entry.action === "in"
      ) {
        seen.add(entry.customerUID);
      }
    });

    return { hour: `${hr}:00`, hourNum: hr, count: seen.size };
  });

  // STAFF-ONLY POPUP LOGIC
  const handleChartClick = (e) => {
    if (!userRole || userRole !== "staff") return;
    if (!e || !e.activeLabel) return;

    const hourStr = e.activeLabel;
    const hour = parseInt(hourStr);

    const seen = new Set();
    logData.forEach((entry) => {
      if (
        entry.date === selectedDate &&
        entry.hour === hour &&
        entry.action === "in"
      ) {
        seen.add(entry.customerUID);
      }
    });

    const list = Array.from(seen).map((uid) => customerMap[uid]);
    setPopupList(list);
    setPopupHour(hourStr);
    setPopupVisible(true);
  };

  // ---------------- LAST 7 DAYS PEAK CALC ----------------
  const uniqueDates = [...new Set(logData.map((log) => log.date))];

  // → SORT dates newest → oldest
  const sortedDates = uniqueDates.sort((a, b) => new Date(b) - new Date(a));

  // → Take the latest 7 days
  const last7Dates = sortedDates.slice(0, 7);

  const dailyPeaks = last7Dates.map((day) => {
    const hourMap = {};
    for (let hr = 0; hr < 24; hr++) hourMap[hr] = new Set();

    logData.forEach((entry) => {
      if (entry.date === day && entry.action === "in") {
        hourMap[entry.hour].add(entry.customerUID);
      }
    });

    const hourCounts = Object.values(hourMap).map((set) => set.size);
    const maxVal = Math.max(...hourCounts);
    const peakHours = Object.entries(hourMap)
      .filter(([hr, set]) => set.size === maxVal && maxVal > 0)
      .map(([hr]) => parseInt(hr));

    let ranges = [];
    if (peakHours.length > 0) {
      let start = peakHours[0];
      let prev = peakHours[0];
      for (let i = 1; i < peakHours.length; i++) {
        if (peakHours[i] === prev + 1) {
          prev = peakHours[i];
        } else {
          ranges.push([start, prev]);
          start = peakHours[i];
          prev = peakHours[i];
        }
      }
      ranges.push([start, prev]);
    }

    const formattedRanges =
      ranges
        .map(([a, b]) => (a === b ? `${a}:00` : `${a}:00 - ${b}:00`))
        .join(", ") || "No Data";

    return {
      date: day,
      shortDate: new Date(day).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      weekday: new Date(day).toLocaleDateString("en-US", {
        weekday: "long",
      }),
      peakRange: formattedRanges,
      count: maxVal,
    };
  });

  // Split customer list
  const leftColumn = customers.filter((_, i) => i % 2 === 0);
  const rightColumn = customers.filter((_, i) => i % 2 !== 0);

  // UI RENDERING
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
        {/* CUSTOMER LIST */}
        <div className="customer-grid">
          <div className="customer-column">
            {leftColumn.map((c, index) => (
              <div key={c.cardId || index} className="customer-item">
                <div
                  className={`status-dot ${
                    c.inside === 1 ? "dot-green" : "dot-red"
                  }`}
                ></div>
                <span style={{ color: "white" }}>{c.name}</span>
              </div>
            ))}
          </div>

          <div className="customer-column">
            {rightColumn.map((c, index) => (
              <div key={c.cardId || index} className="customer-item">
                <div
                  className={`status-dot ${
                    c.inside === 1 ? "dot-green" : "dot-red"
                  }`}
                ></div>
                <span style={{ color: "white" }}>{c.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* PEAK HOURS CHART */}
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
            {[...new Set(logData.map((log) => log.date))]
              .sort((a, b) => new Date(b) - new Date(a))
              .map((date) => (
                <option key={date} value={date}>
                  {date}
                </option>
              ))}
          </select>

          <ResponsiveContainer width="480%" height={350}>
            <AreaChart
              data={chartData}
              margin={{ top: 15, right: 0, left: 0, bottom: 5 }}
              onClick={handleChartClick}
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

        {/* LAST 7 DAYS PEAK CARDS */}
        <h3
          style={{
            color: "orange",
            marginTop: "40px",
            marginBottom: "15px",
          }}
        >
          🔥 Peak Time — Last 7 Days
        </h3>

        <div className="peak-card-grid">
          {dailyPeaks.map((day) => (
            <div key={day.date} className="peak-card">
              <h4 style={{ color: "orange", marginBottom: "10px" }}>
                {day.weekday} ({day.shortDate})
              </h4>

              <p style={{ color: "#fff", fontSize: "1.15em" }}>
                Peak Hours:{" "}
                <span style={{ color: "#FFA500", fontWeight: "bold" }}>
                  {day.peakRange}
                </span>
              </p>

              <p
                style={{ color: "#ccc", fontSize: "0.95em", marginTop: "6px" }}
              >
                Customers: {day.count}
              </p>
            </div>
          ))}
        </div>

        {/* POPUP FOR STAFF */}
        {popupVisible && (
          <div className="popup-overlay">
            <div className="popup-box popup-large">
              <h2 style={{ color: "orange", marginBottom: "10px" }}>
                {selectedDate} — {popupHour}
              </h2>

              <p
                style={{
                  color: "white",
                  fontSize: "1.1em",
                  marginBottom: "20px",
                }}
              >
                Total Count:{" "}
                <span style={{ color: "orange", fontWeight: "bold" }}>
                  {popupList.length}
                </span>
              </p>

              {popupList.length === 0 ? (
                <p style={{ color: "white" }}>No customers found.</p>
              ) : (
                <div className="popup-list-card-wrapper">
                  {popupList.map((name, i) => (
                    <div key={i} className="popup-name-card list-card">
                      {i + 1}. {name}
                    </div>
                  ))}
                </div>
              )}

              <button
                className="popup-close-btn"
                onClick={() => {
                  document
                    .querySelector(".popup-box")
                    .classList.add("popup-closing");
                  setTimeout(() => {
                    setPopupVisible(false);
                  }, 180);
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
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

// Main exporter with role forwarding
function RFIDTracker({ userRole }) {
  return (
    <>
      <CustomerInsideStatus userRole={userRole} />
    </>
  );
}

export default RFIDTracker;
