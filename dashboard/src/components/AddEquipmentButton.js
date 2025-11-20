// src/components/AddEquipmentButton.js
import React from "react";
import "./AddEquipmentButton.css"; // New CSS import

function AddEquipmentButton({ equipmentType }) {
  const handleClick = () => {
    alert(
      `Opening form to add new ${equipmentType} equipment... (Functionality not implemented)`
    );
  };

  return (
    <button className="add-button" onClick={handleClick}>
      + Add New {equipmentType}
    </button>
  );
}

export default AddEquipmentButton;
