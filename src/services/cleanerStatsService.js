import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../config/firebase";
import { LISTRO_ID } from "../config/constants";

/**
 * ===============================
 * CLEANER STATS (SERVICE ONLY)
 * ===============================
 *
 * Returns:
 * {
 *   [cleanerId]: {
 *     totalJobs,
 *     totalEarnings
 *   }
 * }
 */
export const getCleanerStats = async () => {
  const q = query(
    collection(db, "orders"),
    where("listroId", "==", LISTRO_ID),
    where("orderType", "==", "service"),
    where("jobStatus", "==", "completed")
  );

  const snap = await getDocs(q);

  const statsMap = {};

  snap.forEach((doc) => {
    const data = doc.data();
    const cleanerId = data.assignedCleanerId;
    const earning = Number(data.earning || 0);

    if (!cleanerId) return;

    if (!statsMap[cleanerId]) {
      statsMap[cleanerId] = {
        totalJobs: 0,
        totalEarnings: 0,
      };
    }

    statsMap[cleanerId].totalJobs += 1;
    statsMap[cleanerId].totalEarnings += earning;
  });

  return statsMap;
};
