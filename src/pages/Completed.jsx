import React, { useEffect, useMemo, useState } from "react";
import { db } from "../config/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
} from "firebase/firestore";
import { LISTRO_ID } from "../config/constants";

import OrderDetailsModal from "../components/OrderDetailsModal";
import "./orders.css";

/**
 * ===============================
 * COMPLETED — CLEANING ORDERS
 * ===============================
 */

export default function Completed() {
  const [orders, setOrders] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [loading, setLoading] = useState(true);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  /* ================= HELPERS ================= */

  const formatDate = (v) => {
    if (!v) return "—";
    if (typeof v?.toDate === "function")
      return v.toDate().toLocaleDateString();
    if (typeof v === "number")
      return new Date(v).toLocaleDateString();
    return "—";
  };

  const resolveCleaner = (o) =>
    o.assignedCleanerName || "—";

const resolveService = (o) =>
  o?.items && o.items.length > 0
    ? o.items
        .map((i) => `${i.shoeType || ""} - ${i.serviceType || ""}`)
        .join(", ")
    : o.serviceType || o.service || o.serviceName || "—";

  const resolvePrice = (o) => {
    const n = Number(o?.price ?? o?.earning);
    return Number.isFinite(n) ? `${n} AED` : "—";
  };

  /* ================= LOAD USERS ================= */

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

  /* ================= LOAD COMPLETED ================= */

  useEffect(() => {
    const q = query(
      collection(db, "orders"),
      where("listroId", "==", LISTRO_ID),
      where("orderType", "==", "service"),
      where("jobStatus", "==", "completed"),
      orderBy("lastUpdatedAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          idShort: d.id.slice(0, 6),
          ...d.data(),
        }));
        setOrders(list);
        setLoading(false);
      },
      (err) => {
        console.error("Completed orders error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  /* ================= FILTER + SORT ================= */

  const filtered = useMemo(() => {
    const s = searchText.toLowerCase();

    return orders
      .filter((o) => {
        const customer = (usersMap[o.userId] || "").toLowerCase();
        const matchSearch =
          !s || customer.includes(s) || o.idShort.includes(s);
        return matchSearch;
      })
      .sort((a, b) => {
        const aTime =
          a.lastUpdatedAt?.toDate?.()?.getTime?.() ||
          a.completedAt?.toDate?.()?.getTime?.() ||
          a.createdAt?.toDate?.()?.getTime?.() ||
          0;
        const bTime =
          b.lastUpdatedAt?.toDate?.()?.getTime?.() ||
          b.completedAt?.toDate?.()?.getTime?.() ||
          b.createdAt?.toDate?.()?.getTime?.() ||
          0;

        return sortBy === "newest" ? bTime - aTime : aTime - bTime;
      });
  }, [orders, usersMap, searchText, sortBy]);

  /* ================= UI ================= */

  return (
    <div className="page-container">
      <h1 className="page-title">Completed Cleaning Orders</h1>

      <div className="orders-box">
        {loading ? (
          <p>Loading completed orders…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Service</th>
                <th>Cleaner</th>
                <th>Price</th>
                <th>Completed</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((o) => (
                <tr key={o.id}>
                  <td>{o.idShort}</td>
                  <td>{usersMap[o.userId] || "—"}</td>
                  <td>{resolveService(o)}</td>
                  <td>{resolveCleaner(o)}</td>
                  <td>{resolvePrice(o)}</td>
                  <td>{formatDate(o.completedAt || o.lastUpdatedAt)}</td>
                  <td>
                    <button
                      className="btn btn-view"
                      onClick={() => {
                        setSelectedOrder(o);
                        setShowModal(true);
                      }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan="7" className="no-records">
                    No Completed Orders
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          customerName={usersMap[selectedOrder.userId]}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
