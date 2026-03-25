import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc,
  where,
} from "firebase/firestore";
import { db, auth } from "../config/firebase";
import { LISTRO_ID } from "../config/constants";

import OrderDetailsModal from "../components/OrderDetailsModal";
import "./orders.css";

/**
 * ===============================
 * ADMIN — ORDERS (SERVICE ONLY)
 * ===============================
 * ✅ Admin auth check by UID (rule-safe)
 * ✅ Loads only "service" orders
 * ✅ Filters by listroId
 * ✅ Safe sorting (handles old docs missing lastUpdatedAt)
 * ✅ Simple tabs: Pending / Working / Completed
 */

const TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "working", label: "Working" },
  { key: "completed", label: "Completed" },
];

// Status buckets for cleaner lifecycle
const WORKING_STATUSES = new Set([
  "assigned",
  "pickup_pending",
  "picked_up",
  "in_warehouse",
  "in_progress",
  "ready_for_return",
]);

const COMPLETED_STATUSES = new Set(["completed"]);

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState("all");

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);

  /* ================= HELPERS ================= */

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
    : o?.serviceType || o?.service || o?.serviceName || "—";

  const resolvePrice = (o) => {
    const n = Number(o?.price ?? o?.earning);
    return Number.isFinite(n) ? `${n} AED` : "—";
  };

  const resolveStatus = (o) => {
    const s = typeof o?.jobStatus === "string" ? o.jobStatus : "pending";
    return s.replaceAll("_", " ").toUpperCase();
  };

  const resolveMode = (o) =>
    o.serviceMode === "pickup_warehouse" ? "📦 PICKUP" : "🏠 ONSITE";

  const resolveDate = (o) =>
    o.lastUpdatedAt || o.assignedAt || o.createdAt || o.completedAt || null;

  const normalizeStatus = (o) =>
    typeof o?.jobStatus === "string" ? o.jobStatus : "pending";

  /* ================= LOAD DATA ================= */

  const load = async () => {
    try {
      setLoading(true);

      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      // 🔐 Verify admin by UID (rule-safe)
      const adminRef = doc(db, "admins", user.uid);
      const adminSnap = await getDoc(adminRef);
      if (!adminSnap.exists()) throw new Error("Not admin");

      /**
       * 🔥 Load ONLY cleaning/service orders (not shop)
       * Also filter by LISTRO_ID if you use multi-tenant
       */
      const qOrders = query(
        collection(db, "orders"),
        where("orderType", "==", "service"),
        where("listroId", "==", LISTRO_ID),
        orderBy("lastUpdatedAt", "desc")
      );

      let snap;
      try {
        snap = await getDocs(qOrders);
      } catch (e) {
        // If older docs don't have lastUpdatedAt, fallback without orderBy
        const fallback = query(
          collection(db, "orders"),
          where("orderType", "==", "service"),
          where("listroId", "==", LISTRO_ID)
        );
        snap = await getDocs(fallback);
      }

      const list = snap.docs.map((d) => ({
        id: d.id,
        idShort: d.id.slice(0, 6),
        ...d.data(),
      }));

      // Sort in JS as final safety net (handles missing timestamps)
      list.sort((a, b) => {
        const ta =
          (a.lastUpdatedAt?.toMillis?.() ?? a.assignedAt?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0);
        const tb =
          (b.lastUpdatedAt?.toMillis?.() ?? b.assignedAt?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? 0);
        return tb - ta;
      });

      /* 🧍 Load users (admin needs this) */
      const usersSnap = await getDocs(collection(db, "users"));
      const map = {};
      usersSnap.forEach((u) => {
        const d = u.data();
        map[u.id] = d?.name || d?.fullName || d?.displayName || "—";
      });

      setOrders(list);
      setUsersMap(map);
    } catch (err) {
      console.error("Orders load error:", err);
      alert(err?.message || "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  /* ================= FILTERED LIST ================= */

  const filtered = useMemo(() => {
    const list = [...orders];

    if (tab === "pending") {
      return list.filter((o) => normalizeStatus(o) === "pending");
    }
    if (tab === "working") {
      return list.filter((o) => WORKING_STATUSES.has(normalizeStatus(o)));
    }
    if (tab === "completed") {
      return list.filter((o) => COMPLETED_STATUSES.has(normalizeStatus(o)));
    }
    return list;
  }, [orders, tab]);

  /* ================= UI ================= */

  return (
    <div className="page-container">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h1 className="page-title">Cleaning Orders</h1>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`btn ${tab === t.key ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setTab(t.key)}
              type="button"
            >
              {t.label}
            </button>
          ))}

          <button className="btn btn-secondary" onClick={load} type="button">
            Refresh
          </button>
        </div>
      </div>

      <div className="orders-box">
        {loading ? (
          <p>Loading orders…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Service</th>
                <th>Mode</th>
                <th>Status</th>
                <th>Price</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((o) => (
                <tr key={o.id}>
                  <td>{usersMap[o.userId] || "—"}</td>
                  <td>{resolveService(o)}</td>
                  <td>{resolveMode(o)}</td>
                  <td>{resolveStatus(o)}</td>
                  <td>{resolvePrice(o)}</td>
                  <td>{formatDate(resolveDate(o))}</td>
                  <td className="action-buttons">
                    <button
                      className="btn btn-view"
                      onClick={() => {
                        setSelectedOrder(o);
                        setShowModal(true);
                      }}
                      type="button"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan="7" className="no-records">
                    No Orders
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
          onUpdated={load}
        />
      )}
    </div>
  );
}
