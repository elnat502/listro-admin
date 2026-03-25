// src/utils/cleanerUtils.js
import { db } from "../config/firebase";
import { doc, updateDoc, increment } from "firebase/firestore";

// ➕ Increase active orders
export const increaseCleanerOrders = async (cleanerId) => {
  if (!cleanerId) return;

  const cleanerRef = doc(db, "cleaners", cleanerId);
  await updateDoc(cleanerRef, {
    activeOrders: increment(1),
    status: "on-duty",
  });
};

// ➖ Decrease active orders
export const decreaseCleanerOrders = async (cleanerId) => {
  if (!cleanerId) return;

  const cleanerRef = doc(db, "cleaners", cleanerId);
  await updateDoc(cleanerRef, {
    activeOrders: increment(-1),
  });
};
