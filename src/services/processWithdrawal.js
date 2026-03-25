import { functions } from "@/config/firebase";
import { httpsCallable } from "firebase/functions";

/**
 * ===============================
 * ADMIN — PROCESS WITHDRAWAL (FINAL FIX)
 * ===============================
 * Cloud Function expects:
 *  - requestId
 *  - action: "approve" | "reject"
 */

export async function processWithdrawal(payload) {
  try {
    const fn = httpsCallable(functions, "processWithdrawal");

    const res = await fn({
      requestId: payload.requestId,
      action: payload.action,   // <-- THIS MUST BE action
    });

    if (!res?.data?.success) {
      throw new Error(res?.data?.message || "Withdrawal processing failed");
    }

    return res.data;

  } catch (error) {
    console.error("Withdrawal Error:", error);
    throw error;
  }
}
