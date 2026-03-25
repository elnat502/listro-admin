// src/services/releaseCleaner.js
import { db } from "../config/firebase";
import {
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

/**
 * 🔓 RELEASE CLEANER AFTER ORDER COMPLETION (PRODUCTION)
 *
 * IMPORTANT (ANALYTICS & LIFECYCLE RULE):
 * - Analytics & earnings rely ONLY on lifecycleVersion === 3
 * - This is the ONLY place where:
 *   - cleaner.completedJobs increments
 *   - cleaner.totalEarnings increments
 * - Do NOT add earnings or completion logic elsewhere
 *
 * LIFECYCLE FLOW:
 * 0 = pending
 * 1 = assigned
 * 2 = in_progress   ← allowed here
 * 3 = completed     ← terminal (earns money)
 * 4 = cancelled     ← terminal (no earnings)
 *
 * FULLY TRANSACTIONAL (race-condition safe)
 */

export async function releaseCleaner(orderId) {
  if (!orderId) {
    throw new Error("Order ID is required");
  }

  const orderRef = doc(db, "orders", orderId);

  await runTransaction(db, async (transaction) => {
    const orderSnap = await transaction.get(orderRef);

    if (!orderSnap.exists()) {
      throw new Error("Order not found");
    }

    const order = orderSnap.data();

    /* 🔒 LIFECYCLE GUARD — ONLY FROM IN_PROGRESS (v2) */
    const lifecycleVersion = Number(order.lifecycleVersion || 0);
    if (lifecycleVersion !== 2) {
      throw new Error("Blocked by lifecycle guard (complete)");
    }

    /* 🔒 STATE GUARD */
    if (order.jobStatus !== "in_progress") {
      throw new Error("Order is not in releasable state");
    }

    const cleanerId = order.assignedCleanerId;
    if (!cleanerId) {
      throw new Error("Order has no assigned cleaner");
    }

    const cleanerRef = doc(db, "cleaners", cleanerId);
    const cleanerSnap = await transaction.get(cleanerRef);

    if (!cleanerSnap.exists()) {
      throw new Error("Cleaner not found");
    }

    const cleaner = cleanerSnap.data();

    const earning = Number(order.earning || 0);

    const currentActive = Number(cleaner.activeOrders || 0);
    const newActive = Math.max(currentActive - 1, 0);

    const completedJobs = Number(cleaner.completedJobs || 0);
    const totalEarnings = Number(cleaner.totalEarnings || 0);
    const maxJobs = Number(cleaner.maxJobs || 1);

    // 🔥 CRITICAL: stamp the accounting month
    const month = new Date().toISOString().slice(0, 7); // "2025-12"

    /* ================= UPDATE ORDER ================= */
    transaction.update(orderRef, {
      jobStatus: "completed",
      completedAt: serverTimestamp(),
      completedMonth: month, // 🔥 THIS MAKES PAYROLL + PROFIT WORK

      // 🔒 ADVANCE LIFECYCLE (v2 → v3)
      lifecycleVersion: lifecycleVersion + 1,
    });

    /* ================= UPDATE CLEANER ================= */
    transaction.update(cleanerRef, {
      activeOrders: newActive,
      completedJobs: completedJobs + 1,
      totalEarnings: totalEarnings + earning,
      status: newActive < maxJobs ? "available" : "busy",
      lastReleasedAt: serverTimestamp(),
    });
  });

  return true;
}
