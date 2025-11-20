// src/components/AddRFID.js
import React, { useState } from "react";
import { db } from "../Firebase";
import { ref, set } from "firebase/database";

function AddRFID({ cardID }) {
  const [name, setName] = useState("");

  const handleAddUser = async () => {
    if (!name) return;
    await set(ref(db, `users/${cardID}`), {
      name,
      registered: true,
      inside: 0,
    });
    alert("User added!");
  };

  return (
    <div style={{ border: "1px solid gray", padding: "10px", margin: "10px" }}>
      <h3>First-time User Detected: {cardID}</h3>
      <input
        placeholder="Enter Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button onClick={handleAddUser}>Add User</button>
    </div>
  );
}

export default AddRFID;
