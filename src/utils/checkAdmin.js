import { doc, getDoc } from "firebase/firestore";
import { db } from "@/config/firebase";

export async function checkAdmin(uid) {
  if (!uid) return false;

  const ref = doc(db, "admins", uid);
  const snap = await getDoc(ref);

  return snap.exists();
}