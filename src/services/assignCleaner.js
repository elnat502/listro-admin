// src/services/assignCleaner.js
import { db } from "../config/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { LISTRO_ID } from "../config/constants";

/**
 * ===============================
 * 🤖 AUTO ASSIGN CLEANER (SERVICE)
 * ===============================
 *
 * RULES:
 * - Assign ONLY cleaning service orders
 * - Assign ONLY if jobStatus === "pending"
 * - Warehouse jobs DO NOT lock cleaner workload
 * - Onsite jobs DO lock cleaner workload (activeOrders + availability)
 * - Transactional + race-condition safe
 *
 * CLEANER FIELDS SUPPORTED:
 * - maxJobs
 * - activeOrders
 * - availability ("available" | "busy")   ✅ preferred
 * - status ("available" | "busy")         ✅ backward compatible
 */

export async function autoAssignCleaner(orderId) {
  if (!orderId) throw new Error("Order ID is required");

  // We select from cleaners that are "available" (availability OR status)
  // NOTE: Firestore can't OR easily, so we will query availability first,
  // and if none found we fallback to status for backward compatibility.

  const pickCandidateCleaners = async () => {
    // Preferred field: availability
    const q1 = query(
      collection(db, "cleaners"),
      where("listroId", "==", LISTRO_ID),
      where("availability", "==", "available"),
      orderBy("activeOrders", "asc"),
      limit(10) // ✅ IMPORTANT: get a few candidates, not just 1
    );

    const s1 = await getDocs(q1);
    if (!s1.empty) return s1.docs;

    // Fallback old field: status
    const q2 = query(
      collection(db, "cleaners"),
      where("listroId", "==", LISTRO_ID),
      where("status", "==", "available"),
      orderBy("activeOrders", "asc"),
      limit(10) // ✅ IMPORTANT: get a few candidates
    );

    const s2 = await getDocs(q2);
    if (!s2.empty) return s2.docs;

    return [];
  };

  const candidates = await pickCandidateCleaners();
  if (!candidates.length) throw new Error("No available cleaners at the moment");

  const orderRef = doc(db, "orders", orderId);

  // ✅ Try candidates one-by-one (production safe)
  let lastError = null;

  for (const cleanerDoc of candidates) {
    const cleanerRef = doc(db, "cleaners", cleanerDoc.id);

    try {
      await runTransaction(db, async (tx) => {
        const cleanerSnap = await tx.get(cleanerRef);
        const orderSnap = await tx.get(orderRef);

        if (!cleanerSnap.exists()) throw new Error("Cleaner not found");
        if (!orderSnap.exists()) throw new Error("Order not found");

        const cleaner = cleanerSnap.data();
        const order = orderSnap.data();

        /* ===============================
           ORDER GUARDS
        =============================== */

        // ✅ Only service orders
        const orderType = order.orderType || "service";
        if (orderType !== "service") {
          throw new Error("Auto-assign blocked: not a service order");
        }

        // ✅ Only pending
        if (order.jobStatus !== "pending") {
          throw new Error("Order is not pending");
        }

        // ✅ Not already assigned
        if (order.assignedCleanerId) {
          throw new Error("Order already assigned");
        }

        // ✅ Normalize serviceMode (avoid undefined confusion)
        const normalizedMode = order.serviceMode || "onsite";
        const isWarehouse = normalizedMode === "pickup_warehouse";

        /* ===============================
           CLEANER GUARDS
        =============================== */

        const activeOrders = Number(cleaner.activeOrders || 0);
        const maxJobs = Number(cleaner.maxJobs || 1);

        // ✅ REQUIRED FIX:
        // If cleaner already reached maxJobs, block assignment immediately.
        // This ensures cleaner is truly locked, even if UI still shows them.
        if (!isWarehouse && activeOrders >= maxJobs) {
          throw new Error("Cleaner reached max jobs");
        }

        // availability OR status check
        const availability = cleaner.availability || cleaner.status || "available";
        if (!isWarehouse && availability !== "available") {
          throw new Error("Cleaner is not available");
        }

        /* ===============================
           UPDATE ORDER
        =============================== */

        tx.update(orderRef, {
          assignedCleanerId: cleanerRef.id,
          assignedCleanerName: cleaner.name || "—",
          assignedAt: serverTimestamp(),
          assignedBy: "system",

          // ✅ lifecycle alignment (do not break existing)
          lifecycleVersion: Number(order.lifecycleVersion || 0) || 1,

          // ✅ status depends on serviceMode
          jobStatus: isWarehouse ? "pickup_pending" : "assigned",

          // ✅ ensure serviceMode always stored
          serviceMode: normalizedMode,

          lastUpdatedAt: serverTimestamp(),
        });

        /* ===============================
           UPDATE CLEANER (ONSITE ONLY)
        =============================== */

        if (!isWarehouse) {
          const newActive = activeOrders + 1;
          const newAvailability = newActive >= maxJobs ? "busy" : "available";

          tx.update(cleanerRef, {
            activeOrders: newActive,

            // ✅ lock fields (keep BOTH for backward compatibility)
            availability: newAvailability,
            status: newAvailability,

            lastAssignedAt: serverTimestamp(),
          });
        } else {
          // ✅ Optional but helpful: still record assignment time for warehouse orders
          tx.update(cleanerRef, {
            lastAssignedAt: serverTimestamp(),
          });
        }
      });

      // ✅ success → stop loop
      return true;
    } catch (e) {
      lastError = e;
      // Continue trying next cleaner
    }
  }

  // If we tried all and failed
  throw new Error(lastError?.message || "No available cleaners at the moment");
}
