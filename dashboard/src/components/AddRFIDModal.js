import React, { useEffect, useState } from "react";
import "./AddRFIDModal.css";
import { db } from "../Firebase";
import { ref, get, set } from "firebase/database";

function AddRFIDModal({ cardID, onClose, onConnect }) {
  const [unassignedCards, setUnassignedCards] = useState([]);
  const [unassignedCustomers, setUnassignedCustomers] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [assignedList, setAssignedList] = useState([]);

  const loadLists = async () => {
    // 1) Users node -> find cards with no uid
    const usersSnap = await get(ref(db, "users"));
    const newCardList = [];
    const assignedTemp = [];

    if (usersSnap.exists()) {
      const usersObj = usersSnap.val();
      for (const cardKey of Object.keys(usersObj)) {
        const node = usersObj[cardKey];
        if (!node || !node.uid || node.uid === "") {
          newCardList.push(cardKey);
        } else {
          assignedTemp.push({ cardID: cardKey, customerId: node.uid });
        }
      }
    }

    // 2) Customers -> all customers
    const customersSnap = await get(ref(db, "customers"));
    const newCustList = [];
    if (customersSnap.exists()) {
      const customersObj = customersSnap.val();
      for (const custKey of Object.keys(customersObj)) {
        const cust = customersObj[custKey];
        if (cust.role !== "customer") continue;
        // check if any user already linked to this customer
        const isAssigned = Object.values(usersSnap.val() || {}).some(
          (u) => u.uid === custKey
        );
        if (!isAssigned) {
          newCustList.push({
            id: custKey,
            name: cust.name || "(no-name)",
            email: cust.email || "",
          });
        }
      }
    }

    // 3) Assigned list enrichment
    const enrichedAssigned = [];
    for (const a of assignedTemp) {
      const cSnap = await get(ref(db, `customers/${a.customerId}`));
      enrichedAssigned.push({
        cardID: a.cardID,
        customerId: a.customerId,
        customerName: cSnap.exists() ? cSnap.val().name : "(unknown)",
      });
    }

    setUnassignedCards(newCardList);
    setUnassignedCustomers(newCustList);
    setAssignedList(enrichedAssigned);

    if (cardID && newCardList.includes(cardID)) setSelectedCard(cardID);
    else setSelectedCard(newCardList.length ? newCardList[0] : null);

    setSelectedCustomer(newCustList.length ? newCustList[0]?.id : null);
  };

  useEffect(() => {
    loadLists();
  }, [cardID]);

  const handleConnect = async () => {
    if (!selectedCard || !selectedCustomer)
      return alert("Please select one card and one customer.");

    try {
      // Only save mapping in users/<cardID>/uid
      await set(ref(db, `users/${selectedCard}/uid`), selectedCustomer);

      // Ensure registered flag exists
      await set(ref(db, `users/${selectedCard}/registered`), true);

      await loadLists();

      if (onConnect) onConnect();
      alert("Connected card to customer successfully.");
    } catch (err) {
      console.error("Connect error:", err);
      alert("Failed to connect card to customer. See console.");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>User Connect</h2>
        <p>Connect unassigned RFID cards to customers without a card</p>

        <div className="lists-row">
          <div className="list-col">
            <h3>Unassigned RFID Cards</h3>
            <div className="list">
              {unassignedCards.length === 0 && (
                <div className="list-empty">No unassigned cards</div>
              )}
              {unassignedCards.map((c) => (
                <button
                  key={c}
                  className={`list-item ${
                    selectedCard === c ? "selected" : ""
                  }`}
                  onClick={() => setSelectedCard(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="list-col">
            <h3>Customers without card</h3>
            <div className="list">
              {unassignedCustomers.length === 0 && (
                <div className="list-empty">No unassigned customers</div>
              )}
              {unassignedCustomers.map((cust) => (
                <button
                  key={cust.id}
                  className={`list-item ${
                    selectedCustomer === cust.id ? "selected" : ""
                  }`}
                  onClick={() => setSelectedCustomer(cust.id)}
                >
                  <div>{cust.name}</div>
                  <small>{cust.email}</small>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="connect-row">
          <button
            className="btn connect"
            onClick={handleConnect}
            disabled={!selectedCard || !selectedCustomer}
          >
            Connect
          </button>
          <button className="btn cancel" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="assigned-section">
          <h3>Assigned Cards</h3>
          {assignedList.length === 0 && <div>No assigned cards yet</div>}
          <ul>
            {assignedList.map((a) => (
              <li key={a.cardID}>
                <strong>{a.cardID}</strong> → {a.customerName} ({a.customerId})
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default AddRFIDModal;
