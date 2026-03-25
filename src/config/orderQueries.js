import { collection, query, where, orderBy } from "firebase/firestore";
import { db } from "./firebase";
import { LISTRO_ID } from "./constants";

export const baseOrdersRef = collection(db, "orders");

export const pendingOrdersQuery = query(
  baseOrdersRef,
  where("listroId", "==", LISTRO_ID),
  where("status", "==", "pending"),
  orderBy("createdAt", "desc")
);

export const approvedOrdersQuery = query(
  baseOrdersRef,
  where("listroId", "==", LISTRO_ID),
  where("status", "==", "approved"),
  orderBy("createdAt", "desc")
);

export const completedOrdersQuery = query(
  baseOrdersRef,
  where("listroId", "==", LISTRO_ID),
  where("status", "==", "completed"),
  orderBy("createdAt", "desc")
);

export const activeOrdersQuery = query(
  baseOrdersRef,
  where("listroId", "==", LISTRO_ID),
  where("status", "in", ["pending", "approved"]),
  orderBy("createdAt", "desc")
);
