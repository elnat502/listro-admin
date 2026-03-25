import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

import { db, functions } from "../config/firebase";
import { LISTRO_ID } from "../config/constants";

import "../admin.css";

/**
 * ===============================
 * 🚚 RETURN QUEUE (WAREHOUSE → CUSTOMER)
 *
 * FLOW:
 * Cleaner → ready_for_return
 * Admin → assign delivery cleaner
 * Cleaner → returning → completed
 * ===============================
 */

export default function ReturnQueue() {
  const [orders, setOrders] = useState([]);
  const [cleaners, setCleaners] = useState([]);

  /* ===============================
     CLOUD FUNCTION
  =============================== */
  const assignReturnCleaner = httpsCallable(functions, "assignReturnCleaner");

  /* ===============================
     LOAD CLEANERS (DELIVERY)
  =============================== */
  useEffect(() => {
    const loadCleaners = async () => {
      const snap = await getDocs(
        query(
          collection(db, "cleaners"),
          where("listroId", "==", LISTRO_ID)
        )
      );

      setCleaners(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );
    };

    loadCleaners();
  }, []);

  /* ===============================
     LISTENER
  =============================== */
  useEffect(() => {
    const q = query(
      collection(db, "orders"),
      where("serviceMode", "==", "pickup_warehouse"),
      where("jobStatus", "in", ["ready_for_return", "returning"]),
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
      },
      (err) => {
        console.error("ReturnQueue listener error:", err);
        setOrders([]);
      }
    );

    return () => unsub();
  }, []);

  /* ===============================
     ACTION: ASSIGN DELIVERY CLEANER
     🔐 CLOUD FUNCTION ONLY
  =============================== */
  const handleReturning = async (order, cleaner) => {
    if (!cleaner) return alert("Select a cleaner first");

    try {
      await assignReturnCleaner({
        orderId: order.id,
        cleanerId: cleaner.id,
      });
    } catch (e) {
      alert(e.message || "Failed to assign delivery cleaner");
    }
  };

  const statusLabel = (s) =>
    String(s || "pending").replaceAll("_", " ").toUpperCase();

  /* ===============================
     UI
  =============================== */
  return (
    <div className="page-container">
      <h1 className="page-title">🚚 Return Queue</h1>

      <div className="orders-box">
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Shoe</th>
              <th>Status</th>
              <th>Assign Cleaner</th>
            </tr>
          </thead>

          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{o.id.slice(0, 6)}</td>
                <td>{o.customerName || o.userName || "—"}</td>
                <td>{o.shoeType || "—"}</td>
                <td>{statusLabel(o.jobStatus)}</td>

                <td>
                  {o.jobStatus === "ready_for_return" && (
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        const cleaner = cleaners.find(
                          (c) => c.id === e.target.value
                        );
                        handleReturning(o, cleaner);
                      }}
                    >
                      <option value="" disabled>
                        Select cleaner
                      </option>

                      {cleaners.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}

                  {o.jobStatus === "returning" && (
                    <span style={{ color: "#F59E0B", fontWeight: 700 }}>
                      🚚 Out for delivery
                    </span>
                  )}
                </td>
              </tr>
            ))}

            {orders.length === 0 && (
              <tr>
                <td colSpan="5" className="no-records">
                  No returns in progress
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
