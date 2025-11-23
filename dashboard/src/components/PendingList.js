// src/components/PendingList.js (Updated)

import React, { useState, useEffect } from "react";
import { db } from "../Firebase";
import { ref, onValue } from "firebase/database";
import NameAssignmentModal from "./NameAssignmentModal"; // <-- NEW IMPORT

const PendingList = () => {
  const [pendingItems, setPendingItems] = useState([]);
  const [selectedPendingItem, setSelectedPendingItem] = useState(null);
  const [loading, setLoading] = useState(true);

  // ... (Real-time listener useEffect logic remains the same)
  useEffect(() => {
    const pendingRef = ref(db, "pending_items");
    
    const unsubscribe = onValue(pendingRef, (snapshot) => {
      const items = [];
      snapshot.forEach((childSnapshot) => {
        const item = childSnapshot.val();
        items.push({
          id: childSnapshot.key,
          ...item,
        });
      });
      setPendingItems(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Function to open the NEW modal with the selected item's data
  const handleAssignClick = (item) => {
    setSelectedPendingItem(item);
  };

  // Function to close the modal and clear the selected item
  const handleModalClose = () => {
    setSelectedPendingItem(null);
  };
  
  if (loading) {
    return (
      <div className="tracker-card capacity-card">
        <h2>Pending Equipment Assignment</h2>
        <p>Loading pending items...</p>
      </div>
    );
  }

  return (
    <div className="tracker-card capacity-card">
      <h2>Pending Equipment Assignment</h2>
      <p>Tags found at Reader 1 that need a permanent name.</p>
      
      <div className="pending-list">
        {pendingItems.length === 0 ? (
          <p style={{ color: "lightgreen", fontWeight: "bold" }}>
            No pending equipment to name.
          </p>
        ) : (
          pendingItems.map((item) => (
            <div key={item.id} className="pending-item">
              <p>
                **Tag ID:** {item.rfid_tag} 
                <span className="location-tag">({item.initial_location})</span>
              </p>
              <button onClick={() => handleAssignClick(item)}>
                Assign Name
              </button>
            </div>
          ))
        )}
      </div>

      {/* NEW: Use NameAssignmentModal */}
      {selectedPendingItem && (
        <NameAssignmentModal
          pendingItem={selectedPendingItem}
          onClose={handleModalClose} // Use the new close handler
        />
      )}
    </div>
  );
};

export default PendingList;