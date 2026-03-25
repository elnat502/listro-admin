import { db } from "../config/firebase";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { LISTRO_ID } from "../config/constants";

/**
 * ===============================
 * CLEANER PERFORMANCE ANALYTICS
 * ===============================
 *
 * Service-only metrics:
 * - totalJobs
 * - completedJobs
 * - cancelledJobs
 * - pickupJobs
 * - onsiteJobs
 * - avgCompletionTime (minutes)
 * - reliabilityScore (0–100)
 */

export async function getCleanerPerformance() {
  const cleanersSnap = await getDocs(
    query(collection(db, "cleaners"), where("listroId", "==", LISTRO_ID))
  );

  const ordersSnap = await getDocs(
    query(
      collection(db, "orders"),
      where("listroId", "==", LISTRO_ID),
      where("orderType", "==", "service")
    )
  );

  const orders = ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const result = [];

  cleanersSnap.forEach((cleanerDoc) => {
    const cleaner = cleanerDoc.data();
    const cleanerId = cleanerDoc.id;

    // Only orders this cleaner actually worked on
    const myOrders = orders.filter(
      (o) =>
        o.assignedCleanerId === cleanerId &&
        ["assigned", "picked_up", "in_warehouse", "in_progress", "completed", "cancelled"].includes(
          o.jobStatus
        )
    );

    let totalJobs = myOrders.length;
    let completedJobs = 0;
    let cancelledJobs = 0;
    let pickupJobs = 0;
    let onsiteJobs = 0;
    let totalTime = 0;
    let timedJobs = 0;

    myOrders.forEach((o) => {
      // Job type
      if (o.serviceMode === "pickup_warehouse") pickupJobs++;
      else onsiteJobs++;

      // Outcomes
      if (o.jobStatus === "completed") completedJobs++;
      if (o.jobStatus === "cancelled") cancelledJobs++;

      // Duration only when truly completed
      if (
        o.startedAt instanceof Timestamp &&
        o.completedAt instanceof Timestamp
      ) {
        const minutes =
          (o.completedAt.toDate() - o.startedAt.toDate()) / 60000;
        if (minutes > 0 && minutes < 1000) {
          totalTime += minutes;
          timedJobs++;
        }
      }
    });

    const avgCompletionTime =
      timedJobs > 0 ? Math.round(totalTime / timedJobs) : 0;

    const reliabilityScore =
      totalJobs > 0
        ? Math.round((completedJobs / totalJobs) * 100)
        : 100;

    result.push({
      id: cleanerId,
      name: cleaner.name || "—",
      phone: cleaner.phone || "—",
      monthlySalary: Number(cleaner.monthlySalary || 0),

      totalJobs,
      completedJobs,
      cancelledJobs,
      pickupJobs,
      onsiteJobs,
      avgCompletionTime,
      reliabilityScore,
    });
  });

  return result;
}
