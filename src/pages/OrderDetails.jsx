import React, { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../config/firebase";
import "./orderdetails.css";

export default function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const snap = await getDoc(doc(db, "orders", id));
        if (snap.exists()) {
          setOrder({ id: snap.id, ...snap.data() });
        }
      } catch (err) {
        console.error("Failed to load order:", err);
      }
    };

    fetchOrder();
  }, [id]);

  if (!order) {
    return <p style={{ fontSize: 20, margin: "40px" }}>Loading Details...</p>;
  }

  return (
    <div className="details-container">

      {/* Back Button */}
      <button className="back-btn" onClick={() => navigate("/pending")}>
        ⬅ Back to Orders
      </button>

      <h1 className="details-title">Order Details</h1>

      <div className="details-box">
        <p><strong>Order ID:</strong> {order.id}</p>
        <p><strong>Status:</strong> {order.jobStatus}</p>
        <p><strong>Price:</strong> AED {order.earning ?? order.price ?? 0}</p>
        <p><strong>Shoe Type:</strong> {order.shoeType ?? "-"}</p>
        <p><strong>Service Type:</strong> {order.serviceType ?? "-"}</p>
        <p><strong>Customer ID:</strong> {order.userId ?? "-"}</p>
        <p><strong>Cleaner:</strong> {order.assignedCleanerName ?? "Not assigned"}</p>
      </div>

      <p className="done-text">
        🔒 Order state is controlled by cleaner actions only
      </p>

    </div>
  );
}
