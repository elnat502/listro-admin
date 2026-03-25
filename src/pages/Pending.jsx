import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  getDoc,
  updateDoc,
  doc,
  orderBy,
  serverTimestamp,
  runTransaction, // ✅ ADDED
} from "firebase/firestore";
import { db } from "../config/firebase";
import { LISTRO_ID } from "../config/constants";

import AssignCleanerModal from "../components/AssignCleanerModal";
import "./orders.css";

/**
 * ===============================
 * PENDING — CLEANING ORDERS
 *
 * Only:
 * - orderType === "service"
 * - jobStatus === "pending"
 * ===============================
 */

export default function Pending() {
  const [orders, setOrders] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  /* ===============================
     HELPERS
  =============================== */

  const formatDate = (v) => {
    if (!v) return "—";
    if (typeof v?.toDate === "function") return v.toDate().toLocaleDateString();
    if (typeof v === "number") return new Date(v).toLocaleDateString();
    return "—";
  };

 const resolveService = (o) =>
  o?.items && o.items.length > 0
    ? o.items
        .map((i) => `${i.shoeType || ""} - ${i.serviceType || ""}`)
        .join(", ")
    : "—";

  const resolvePrice = (o) => {
    const n = Number(o?.price ?? o?.earning);
    return Number.isFinite(n) ? `${n} AED` : "—";
  };

  const resolveMode = (o) =>
    o.serviceMode === "pickup_warehouse" ? (
      <span style={{ color: "#7C3AED", fontWeight: 700 }}>📦 WAREHOUSE</span>
    ) : (
      <span style={{ color: "#2563EB", fontWeight: 700 }}>🏠 ONSITE</span>
    );

  /* ===============================
     LOAD USERS
  =============================== */

  useEffect(() => {
    const loadUsers = async () => {
      const snap = await getDocs(collection(db, "users"));
      const map = {};
      snap.forEach((u) => {
        const d = u.data();
        map[u.id] = d?.name || d?.fullName || d?.displayName || "—";
      });
      setUsersMap(map);
    };

    loadUsers();
  }, []);

  /* ===============================
     LOAD PENDING ORDERS
  =============================== */

  useEffect(() => {
    const q = query(
      collection(db, "orders"),
      where("listroId", "==", LISTRO_ID),
      where("orderType", "==", "service"),
      where("jobStatus", "==", "pending"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setOrders(list);
        setLoading(false);
      },
      (err) => {
        console.error("Pending orders error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  /* ===============================
     ACTIONS
  =============================== */

  const rejectOrder = async (orderId) => {
    if (!window.confirm("Reject this order?")) return;

    try {
      // Optional reason (recommended for audit)
      const reason =
        window.prompt("Optional: Reject reason (leave blank if none)") || "";

      const orderRef = doc(db, "orders", orderId);

      // ✅ Transaction = safe lifecycle + safe cleaner release
      await runTransaction(db, async (tx) => {
        const orderSnap = await tx.get(orderRef);
        if (!orderSnap.exists()) throw new Error("Order not found.");

        const orderData = orderSnap.data();
        const currentStatus = String(orderData?.jobStatus || "pending");
        const currentLv = Number.isFinite(Number(orderData?.lifecycleVersion))
          ? Number(orderData.lifecycleVersion)
          : 0;

        // Safety: only reject pending from this page
        if (currentStatus !== "pending") {
          throw new Error("This order is no longer pending.");
        }

        // ✅ Update order fields to match your Firestore rules
        tx.update(orderRef, {
          jobStatus: "rejected",
          cancelledAt: serverTimestamp(),
          cancelledBy: "admin",
          cancelReason: reason.trim() || null,
          lifecycleVersion: currentLv + 1,
          lastUpdatedAt: serverTimestamp(),
        });

        // ✅ If somehow assignedCleanerId exists, release cleaner too
        const cleanerId = orderData?.assignedCleanerId;
        if (cleanerId) {
          const cleanerRef = doc(db, "cleaners", cleanerId);
          const cleanerSnap = await tx.get(cleanerRef);

          if (cleanerSnap.exists()) {
            const cleanerData = cleanerSnap.data();
            const activeOrdersNum = Number.isFinite(Number(cleanerData?.activeOrders))
              ? Number(cleanerData.activeOrders)
              : 0;

            tx.update(cleanerRef, {
              status: "idle",
              activeOrders: Math.max(0, activeOrdersNum - 1),
              activeOrderId: null,
              inProgressOrderId: null,
              lastReleasedAt: serverTimestamp(),
              lastUpdatedAt: serverTimestamp(),
            });
          }
        }
      });

      alert("✅ Order rejected.");
    } catch (err) {
      console.error("Reject order failed:", err);
      alert(err?.message || "Reject failed (permission or network).");
    }
  };

  /* ===============================
     UI
  =============================== */

  return (
    <div className="page-container">
      <h1 className="page-title">Pending Cleaning Orders</h1>

      <div className="orders-box">
        {loading ? (
          <p>Loading pending orders…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Service</th>
                <th>Mode</th>
                <th>Price</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{usersMap[o.userId] || "—"}</td>
                  <td>{resolveService(o)}</td>
                  <td>{resolveMode(o)}</td>
                  <td>{resolvePrice(o)}</td>
                  <td>{formatDate(o.createdAt)}</td>
                  <td className="action-buttons">
                    <button
                      className="btn btn-assign"
                      onClick={() => setSelectedOrder(o)}
                    >
                      Assign
                    </button>

                    <button
                      className="btn btn-reject"
                      onClick={() => rejectOrder(o.id)}
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}

              {orders.length === 0 && (
                <tr>
                  <td colSpan="6" className="no-records">
                    No Pending Orders
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {selectedOrder && (
        <AssignCleanerModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onAssigned={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
}