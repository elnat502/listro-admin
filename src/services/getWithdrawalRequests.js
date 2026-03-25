import { db } from "@/config/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

/**
 * ===============================
 * ADMIN — REALTIME WITHDRAWAL FEED (SAFE)
 * ===============================
 */

export function subscribeWithdrawals(onUpdate) {
  console.log("subscribeWithdrawals: Starting listener");

  const q = query(
    collection(db, "withdrawalRequests"),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    q,
    (snap) => {
      console.log("subscribeWithdrawals: snapshot size =", snap.size);

      const list = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      onUpdate(list);
    },
    (error) => {
      console.error(
        "subscribeWithdrawals Firestore error:",
        error.message
      );

      // Return empty list on permission error
      onUpdate([]);
    }
  );
}
