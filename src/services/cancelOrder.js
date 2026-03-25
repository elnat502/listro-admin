import { db } from "../config/firebase";
import {
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

/**
 * ❌ CANCEL / REJECT ORDER
 *
 * STEP 6.4 — LIFECYCLE SAFE
 *
 * RULES:
 * - Can cancel from v0, v1, v2
 * - Blocks double cancel
 * - Releases cleaner if assigned
 * - Fully transactional
 */
export async function cancelOrder(orderId, reason = "cancelled") {
  if (!orderId) {
    throw new Error("Order ID is required");
  }

  const orderRef = doc(db, "orders", orderId);

  await runTransaction(db, async (tx) => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists()) {
      throw new Error("Order not found");
    }

    const order = orderSnap.data();
    const v = Number(order.lifecycleVersion || 0);

    /* 🔒 TERMINAL STATE GUARD */
    if (v >= 3) {
      throw new Error("Order already completed or cancelled");
    }

    let cleanerRef = null;
    let cleanerSnap = null;

    if (order.assignedCleanerId) {
      cleanerRef = doc(db, "cleaners", order.assignedCleanerId);
      cleanerSnap = await tx.get(cleanerRef);
    }

    /* ================= UPDATE ORDER ================= */
    tx.update(orderRef, {
      jobStatus: "cancelled",
      cancelledAt: serverTimestamp(),
      cancelReason: reason,

      // 🔒 TERMINAL LIFECYCLE
      lifecycleVersion: 4,
    });

    /* ================= RELEASE CLEANER (IF ANY) ================= */
    if (cleanerRef && cleanerSnap?.exists()) {
      const cleaner = cleanerSnap.data();

      const activeOrders = Math.max(
        Number(cleaner.activeOrders || 1) - 1,
        0
      );

      const maxJobs = Number(cleaner.maxJobs || 1);
      const status =
        activeOrders < maxJobs ? "available" : "busy";

      tx.update(cleanerRef, {
        activeOrders,
        status,
        lastReleasedAt: serverTimestamp(),
      });
    }
  });

  return true;
}
