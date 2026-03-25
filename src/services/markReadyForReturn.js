import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { guardOrderLifecycle } from "./lifecycleGuard";

/**
 * 📦 MARK ORDER READY FOR RETURN
 *
 * Used ONLY for PICKUP jobs
 * Cleaner finished cleaning
 * Shoes move from warehouse → delivery queue
 *
 * Flow:
 * in_progress → ready_for_return
 *
 * Does NOT pay cleaner
 * Does NOT release cleaner
 */

export async function markReadyForReturn(orderId) {
  if (!orderId) throw new Error("Order ID required");

  const orderRef = doc(db, "orders", orderId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists()) throw new Error("Order not found");

    const order = snap.data();

    // 🔒 Must be in_progress
    guardOrderLifecycle(order, "markReadyForReturn");

    // 🔥 Only PICKUP jobs can go to return queue
    if (!order.pickupRequired) {
      throw new Error("Only pickup jobs go to return queue");
    }

    // 1️⃣ Move order into return queue
    tx.update(orderRef, {
      jobStatus: "ready_for_return",
      readyForReturnAt: serverTimestamp(),
    });
  });

  return true;
}
