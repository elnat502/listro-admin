import React, { useEffect, useState } from "react";
import { db } from "../config/firebase";
import {
  collection,
  getDocs,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import "./assignCleaner.css";

export default function AssignCleanerModal({ order, onClose, onAssigned }) {
  const [cleaners, setCleaners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState(null);

  const [selectedCleanerId, setSelectedCleanerId] = useState("");

  const isWarehouse = order?.serviceMode === "pickup_warehouse";

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const snap = await getDocs(collection(db, "cleaners"));
        if (!mounted) return;

        setCleaners(
          snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }))
        );
      } catch {
        alert("Failed to load cleaners");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => (mounted = false);
  }, []);

  /* ===============================
     ASSIGN CLEANER (LOCKED + SAFE)
  =============================== */
  const assignCleaner = async (cleaner) => {
    if (!order?.id || assigningId) return;
    if (!cleaner?.id) return;

    if (!window.confirm(`Assign ${cleaner.name} to this order?`)) return;

    setAssigningId(cleaner.id);

    try {
      await runTransaction(db, async (tx) => {
        const orderRef = doc(db, "orders", order.id);
        const cleanerRef = doc(db, "cleaners", cleaner.id);

        const orderSnap = await tx.get(orderRef);
        const cleanerSnap = await tx.get(cleanerRef);

        if (!orderSnap.exists()) throw new Error("Order not found");
        if (!cleanerSnap.exists()) throw new Error("Cleaner not found");

        const o = orderSnap.data();
        const c = cleanerSnap.data();
// 🔥 CASH BLOCK CHECK (CRITICAL)
if (Number(c.cashOwedToCompany || 0) >= 200) {
  throw new Error(`${c.name} must settle company cash before new job`);
}
        // 🔥 FIX 1: Prevent double assignment completely
        if (o.assignedCleanerId) {
          throw new Error("Order already assigned");
        }

        if (!["pending", "pending_admin"].includes(o.jobStatus)) {
  throw new Error("Order is no longer pending");
}

        if (!isWarehouse && (c.status === "busy" || !!c.activeOrderId)) {
          throw new Error(`${c.name} is already busy`);
        }

        const active = Number(c.activeOrders || 0);
        const max = Number(c.maxJobs || 1);

        if (!isWarehouse && active >= max) {
          throw new Error(`${c.name} is already busy`);
        }

        /* 🔒 LOCK CLEANER */
        let newActive = active;
        let newAvailability = c.availability || "available";

        if (!isWarehouse) {
          newActive = active + 1;
          newAvailability = newActive >= max ? "busy" : "available";

          tx.update(cleanerRef, {
            activeOrders: newActive,
            availability: newAvailability,
            status: "busy",
            activeOrderId: order.id,
            lastAssignedAt: serverTimestamp(),

            // 🔥 FIX 2: ensure field always exists
            lastUpdatedAt: serverTimestamp(),
          });
        } else {
          tx.update(cleanerRef, {
            lastAssignedAt: serverTimestamp(),
          });
        }

        /* ORDER UPDATE */
        tx.update(orderRef, {
          assignedCleanerId: cleaner.id,

          // 🔥 FIX 3: always safe name fallback
          assignedCleanerName: c.name || "Cleaner",

          jobStatus: isWarehouse ? "pickup_pending" : "assigned",
          assignedAt: serverTimestamp(),

          lifecycleVersion: (o.lifecycleVersion || 0) + 1,
          lastUpdatedAt: serverTimestamp(),

          serviceMode: o.serviceMode || "onsite",
          orderType: o.orderType || "service",

          // 🔥 FIX 4: ensure consistent payment defaults
          paymentStatus: o.paymentStatus || "unpaid",
        });

        /* UI SYNC */
        setCleaners((prev) =>
          prev.map((cl) =>
            cl.id === cleaner.id
              ? {
                  ...cl,
                  activeOrders: newActive,
                  availability: newAvailability,
                  status: !isWarehouse ? "busy" : cl.status,
                  activeOrderId: !isWarehouse ? order.id : cl.activeOrderId,
                }
              : cl
          )
        );
      });

      onAssigned?.();
      onClose();
    } catch (err) {
      alert(err.message || "Failed to assign cleaner");
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>✕</button>

        <h2 className="modal-title">
          {isWarehouse ? "📦 Assign Pickup" : "🏠 Assign Cleaner"}
        </h2>

        {loading ? (
          <p>Loading cleaners…</p>
        ) : (
          <>
            {!isWarehouse && (
              <div style={{ marginBottom: 16 }}>
                <select
                  className="cleaner-dropdown"
                  value={selectedCleanerId}
                  onChange={(e) => setSelectedCleanerId(e.target.value)}
                >
                  <option value="">Select available cleaner</option>
                  {cleaners
                    .filter((c) => {
                      const active = Number(c.activeOrders || 0);
                      const max = Number(c.maxJobs || 1);
                      const availableByJobs = active < max;

                      const notHardLocked =
                        c.status !== "busy" && !c.activeOrderId;

                      return availableByJobs && notHardLocked;
                    })
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.activeOrders || 0}/{c.maxJobs || 1})
                      </option>
                    ))}
                </select>

                <button
                  className="btn btn-assign"
                  style={{ marginTop: 8 }}
                  disabled={!selectedCleanerId}
                  onClick={() =>
                    assignCleaner(
                      cleaners.find((c) => c.id === selectedCleanerId)
                    )
                  }
                >
                  Assign Selected Cleaner
                </button>
              </div>
            )}

            <ul className="cleaner-list">
              {cleaners.map((c) => {
                const active = Number(c.activeOrders || 0);
                const max = Number(c.maxJobs || 1);
                const available = active < max;

                const hardLocked =
                  c.status === "busy" || !!c.activeOrderId;

                const canAssign = isWarehouse
                  ? true
                  : available && !hardLocked;

                return (
                  <li key={c.id} className="cleaner-item">
                    <div className="cleaner-info">
                      <strong>{c.name}</strong>
                      <span>{c.phone || "—"}</span>

                      {!isWarehouse && (
                        <small>
                          Jobs: {active}/{max} •{" "}
                          <b style={{ color: canAssign ? "green" : "red" }}>
                            {canAssign ? "AVAILABLE" : "BUSY"}
                          </b>
                        </small>
                      )}
                    </div>

                    <button
                      className="btn btn-assign"
                      disabled={!canAssign}
                      onClick={() => assignCleaner(c)}
                    >
                      {assigningId === c.id ? "Assigning…" : "Assign"}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}