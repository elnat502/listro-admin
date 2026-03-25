import React, { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions, db } from "../config/firebase"; // ✅ ADD db (keep functions)
import { doc, updateDoc, serverTimestamp } from "firebase/firestore"; // ✅ ADD
import "../admin.css";

/**
 * ===============================
 * ORDER DETAILS MODAL (ADMIN)
 * ===============================
 *
 * ✔ Admin-only
 * ✔ Lifecycle-aware
 * ✔ Emergency cancel hardened
 * ✔ Audit-safe
 */

const CANCELABLE_STATUSES = new Set([
  "assigned",
  "pickup_pending",
  "picked_up",
  "in_warehouse",
  "in_progress",
  "ready_for_return",
]);

export default function OrderDetailsModal({
  order,
  customerName,
  onClose,
  onUpdated,
}) {
  const [loading, setLoading] = useState(false);

  // existing emergency cancel confirm
  const [showConfirm, setShowConfirm] = useState(false);
  const [reason, setReason] = useState("");

  // ✅ ADD: reject pending confirm
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  if (!order) return null;

  /* ===============================
     SAFE FIELD RESOLUTION
  =============================== */

  const customer =
    customerName ||
    order.customerName ||
    order.userName ||
    order.customer?.name ||
    order.user?.name ||
    "—";

  const service =
  order?.items
    ?.map((i) => `${i.shoeType} - ${i.serviceType}`)
    .join(", ") ||
  order.serviceType ||
  order.service ||
  order.serviceName ||
  "-";

  const mode =
    order.serviceMode === "pickup_warehouse"
      ? "📦 PICKUP / WAREHOUSE"
      : "🏠 ONSITE";

  const price = Number.isFinite(Number(order.price ?? order.earning))
    ? `${order.price ?? order.earning} AED`
    : "—";

  const cleaner = order.assignedCleanerName || "Not Assigned";

  const rawStatus = String(order.jobStatus || "pending");
  const jobStatus = rawStatus.replaceAll("_", " ").toUpperCase();

  const canEmergencyCancel = CANCELABLE_STATUSES.has(rawStatus);

  // ✅ ADD: pending orders can be rejected/cancelled
  const canRejectPending = rawStatus === "pending";

  const formatDate = (v) => {
    if (!v) return "—";
    if (typeof v?.toDate === "function") return v.toDate().toLocaleString();
    if (typeof v === "number") return new Date(v).toLocaleString();
    return "—";
  };

  // ✅ OPTIONAL: show shoeType safely even when you moved to items[]
  const shoeTypeDisplay =
    order.shoeType ||
    (Array.isArray(order.items) && order.items[0]?.shoeType) ||
    "—";

  /* ===============================
     🚫 REJECT / CANCEL PENDING (ADMIN)
     - Cancels ONLY pending orders
     - Does not need Cloud Function
  =============================== */
  const confirmRejectPending = async () => {
    try {
      setLoading(true);

      const lifecycle = Number(order.lifecycleVersion || 0);

      await updateDoc(doc(db, "orders", order.id), {
        jobStatus: "cancelled",
        cancelledBy: "admin",
        cancelReason: rejectReason?.trim() || "Rejected by admin",
        cancelledAt: serverTimestamp(),

        // Safe reset in case something was set wrongly
        assignedCleanerId: null,
        assignedCleanerName: null,
        assignedAt: null,

        lifecycleVersion: lifecycle + 1,
        lastUpdatedAt: serverTimestamp(),
      });

      alert("✅ Order cancelled (rejected) successfully.");

      setShowRejectConfirm(false);
      onClose();
      onUpdated?.();
    } catch (err) {
      console.error("Reject pending failed:", err);
      alert(err?.message || "Failed to reject pending order.");
    } finally {
      setLoading(false);
    }
  };

  /* ===============================
     🚨 EMERGENCY CANCEL (ADMIN)
  =============================== */
  const confirmEmergencyCancel = async () => {
    try {
      setLoading(true);

      const fn = httpsCallable(functions, "emergencyCancelJob");
      await fn({
        orderId: order.id,
        reason: reason?.trim() || null,
      });

      alert("✅ Job cancelled and cleaner released.");

      setShowConfirm(false);
      onClose();
      onUpdated?.();
    } catch (err) {
      console.error("Emergency cancel failed:", err);
      alert(err?.message || "Failed to cancel job.");
    } finally {
      setLoading(false);
    }
  };

  /* ===============================
     UI
  =============================== */
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>
          ×
        </button>

        <h2 className="modal-title">
          Order Details <span style={{ opacity: 0.6 }}>({mode})</span>
        </h2>

        <div className="modal-body">
          <p><strong>Order ID:</strong> {order.id}</p>
          <p><strong>Customer:</strong> {customer}</p>
          <p><strong>Shoe Type:</strong> {shoeTypeDisplay}</p>
          <p><strong>Service:</strong> {service}</p>
          <p><strong>Mode:</strong> {mode}</p>
          <p><strong>Price:</strong> {price}</p>
          <p><strong>Status:</strong> {jobStatus}</p>
          <p><strong>Cleaner:</strong> {cleaner}</p>

          <hr style={{ margin: "16px 0", opacity: 0.2 }} />

          <p><strong>Created:</strong> {formatDate(order.createdAt)}</p>
          {order.assignedAt && (
            <p><strong>Assigned:</strong> {formatDate(order.assignedAt)}</p>
          )}
          {order.startedAt && (
            <p><strong>Started:</strong> {formatDate(order.startedAt)}</p>
          )}
          {order.completedAt && (
            <p><strong>Completed:</strong> {formatDate(order.completedAt)}</p>
          )}
        </div>

        <div className="modal-footer" style={{ gap: 12 }}>
          {/* ✅ ADD: Reject pending */}
          {canRejectPending && (
            <button
              className="btn btn-danger"
              onClick={() => setShowRejectConfirm(true)}
              disabled={loading}
            >
              ❌ Reject / Cancel Order
            </button>
          )}

          {/* Existing: Emergency cancel for in-progress statuses */}
          {canEmergencyCancel && (
            <button
              className="btn btn-danger"
              onClick={() => setShowConfirm(true)}
              disabled={loading}
            >
              🚨 Emergency Cancel Job
            </button>
          )}

          {rawStatus === "completed" && (
            <span style={{ color: "#10B981", fontWeight: 700 }}>
              ✔ Order Completed
            </span>
          )}

          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      {/* ===============================
          ✅ REJECT CONFIRMATION MODAL
      =============================== */}
      {showRejectConfirm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 420 }}>
            <h3 style={{ color: "#DC2626" }}>⚠️ Reject / Cancel Pending Order</h3>

            <p style={{ fontSize: 14, lineHeight: 1.5 }}>
              This will cancel the order and allow the customer to create a new one.
            </p>

            <textarea
              placeholder="Optional reason (audit log)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              style={{
                width: "100%",
                marginTop: 12,
                padding: 8,
                resize: "none",
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 16,
              }}
            >
              <button
                className="btn btn-ghost"
                onClick={() => setShowRejectConfirm(false)}
                disabled={loading}
              >
                Back
              </button>

              <button
                className="btn btn-danger"
                onClick={confirmRejectPending}
                disabled={loading}
              >
                {loading ? "Cancelling..." : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===============================
          EXISTING EMERGENCY CONFIRM MODAL
      =============================== */}
      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 420 }}>
            <h3 style={{ color: "#DC2626" }}>⚠️ Emergency Cancel</h3>

            <p style={{ fontSize: 14, lineHeight: 1.5 }}>
              This action is <strong>irreversible</strong>.
              <br />
              It will immediately cancel the job and release the cleaner.
            </p>

            <textarea
              placeholder="Optional reason (for audit log)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              style={{
                width: "100%",
                marginTop: 12,
                padding: 8,
                resize: "none",
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 16,
              }}
            >
              <button
                className="btn btn-ghost"
                onClick={() => setShowConfirm(false)}
                disabled={loading}
              >
                Cancel
              </button>

              <button
                className="btn btn-danger"
                onClick={confirmEmergencyCancel}
                disabled={loading}
              >
                {loading ? "Cancelling..." : "Confirm Emergency Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}