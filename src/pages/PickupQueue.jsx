import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
  orderBy,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { LISTRO_ID } from "../config/constants";
import "../admin.css";

/**
 * ===============================
 * 📦 PICKUP & WAREHOUSE QUEUE (ADMIN)
 *
 * Lifecycle:
 * assigned → picked_up → in_warehouse → assigned → in_progress → completed
 *
 * (Cleaner only receives jobs in "assigned")
 * ===============================
 */

export default function PickupQueue() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "orders"),
      where("listroId", "==", LISTRO_ID),
      where("orderType", "==", "service"),
      where("serviceMode", "==", "pickup_warehouse"),
      where("jobStatus", "in", ["assigned", "picked_up", "in_warehouse"]),
      orderBy("lastUpdatedAt", "desc")
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
        console.error("Pickup queue error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  /* ===============================
     ACTIONS (RULE-SAFE)
  =============================== */

  const markPickedUp = async (o) => {
    await updateDoc(doc(db, "orders", o.id), {
      jobStatus: "picked_up",
      pickedUpAt: serverTimestamp(),
      lifecycleVersion: o.lifecycleVersion + 1,
      lastUpdatedAt: serverTimestamp(),
    });
  };

  const markInWarehouse = async (o) => {
    await updateDoc(doc(db, "orders", o.id), {
      jobStatus: "in_warehouse",
      warehouseArrivedAt: serverTimestamp(), // ✅ MUST MATCH RULE
      lifecycleVersion: o.lifecycleVersion + 1,
      lastUpdatedAt: serverTimestamp(),
    });
  };

  const releaseToCleaner = async (o) => {
    await updateDoc(doc(db, "orders", o.id), {
      jobStatus: "assigned", // 🔑 Cleaner can now see it
      lifecycleVersion: o.lifecycleVersion + 1,
      lastUpdatedAt: serverTimestamp(),
    });
  };

  /* ===============================
     HELPERS
  =============================== */

  const formatDate = (v) => {
    if (!v) return "—";
    if (typeof v?.toDate === "function") return v.toDate().toLocaleDateString();
    if (typeof v === "number") return new Date(v).toLocaleDateString();
    return "—";
  };

  const resolveStatus = (s) =>
    String(s || "pending").replaceAll("_", " ").toUpperCase();

  /* ===============================
     UI
  =============================== */

  return (
    <div className="page-container">
      <h1 className="page-title">📦 Pickup & Warehouse</h1>

      <div className="orders-box">
        {loading ? (
          <p>Loading pickup jobs…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Shoe</th>
                <th>Status</th>
                <th>Last Update</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.id.slice(0, 6)}</td>
                  <td>{o.customerName || o.userName || "—"}</td>
                  <td>{o.shoeType || "—"}</td>
                  <td>{resolveStatus(o.jobStatus)}</td>
                  <td>{formatDate(o.lastUpdatedAt || o.assignedAt)}</td>

                  <td className="action-buttons">
                    {o.jobStatus === "assigned" && (
                      <button
                        className="btn btn-primary"
                        onClick={() => markPickedUp(o)}
                      >
                        🚚 Picked Up
                      </button>
                    )}

                    {o.jobStatus === "picked_up" && (
                      <button
                        className="btn btn-success"
                        onClick={() => markInWarehouse(o)}
                      >
                        🏭 In Warehouse
                      </button>
                    )}

                    {o.jobStatus === "in_warehouse" && (
                      <button
                        className="btn btn-warning"
                        onClick={() => releaseToCleaner(o)}
                      >
                        🧼 Release to Cleaner
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {orders.length === 0 && (
                <tr>
                  <td colSpan="6" className="no-records">
                    No pickup jobs
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
