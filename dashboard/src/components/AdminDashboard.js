// src/components/AdminDashboard.js
import React, { useState, useEffect } from "react";
import AddStaffModal from "./AddStaffModal";
import "./AdminDashboard.css";
import { getStaffList, deleteStaff } from "../Firebase";

// The AdminDashboard component now receives the new onLogout prop
function AdminDashboard({ onLogout }) {
  const [staff, setStaff] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchStaffData = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const data = await getStaffList();
      setStaff(data);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setFetchError("Failed to load staff list.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffData();
  }, []);

  const handleStaffAdded = () => {
    fetchStaffData();
    setIsAddModalOpen(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this staff?")) return;

    try {
      await deleteStaff(id);
      fetchStaffData();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const renderStaffTable = () => {
    if (isLoading) return <p className="loading-message">Loading...</p>;
    if (fetchError) return <div className="error-message">{fetchError}</div>;
    if (staff.length === 0) return <p>No staff yet!</p>;

    return (
      <table className="staff-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Password</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {staff.map((s) => (
            <tr key={s.id}>
              <td>{s.name}</td>
              <td>{s.email}</td>
              <td>{s.role}</td>
              <td>********</td>
              <td>
                <button
                  className="delete-btn"
                  onClick={() => handleDelete(s.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="staff-dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Staff Management</h1>

        {/* LOGOUT BUTTON: Now styled inline for consistency and theme compliance */}
        <button
          onClick={onLogout}
          style={{
            padding: "8px 15px",
            background: "#f85149", // 🔴 Red background (Logout color)
            color: "white", // White text
            borderRadius: "4px",
            border: "none",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Logout
        </button>
      </div>

      <div className="staff-list-section">
        <h2>Staff List ({staff.length})</h2>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="add-staff-trigger"
        >
          + Add Staff
        </button>

        {renderStaffTable()}
      </div>

      {isAddModalOpen && (
        <AddStaffModal
          onClose={() => setIsAddModalOpen(false)}
          onAdd={handleStaffAdded}
        />
      )}
    </div>
  );
}

export default AdminDashboard;
