import { functions } from "../../config/firebase";
import { httpsCallable } from "firebase/functions";

/**
 * ===============================
 * ADMIN — SETTLE CLEANER COD
 * ===============================
 * Calls Cloud Function: settleCleaner
 *
 * Server will:
 *  - Read companyLedger
 *  - Apply partial or full settlement
 *  - Update cleaners.cashOwedToCompany
 *  - Write settlement record
 *  - Enforce admin-only access
 */

export async function settleCleaner(cleanerId, amount) {
  if (!cleanerId) {
    throw new Error("Missing cleanerId");
  }

  // Normalize amount
  const amt =
    amount === undefined || amount === null || amount === ""
      ? undefined
      : Number(amount);

  if (amt !== undefined && (!Number.isFinite(amt) || amt <= 0)) {
    throw new Error("Invalid settlement amount");
  }

  try {
    const fn = httpsCallable(functions, "settleCleaner");

    const res = await fn({
      cleanerId,
      ...(amt !== undefined ? { amount: amt } : {}),
    });

    if (!res || !res.data) {
      throw new Error("No response from server");
    }

    if (res.data.success !== true) {
      throw new Error(res.data.message || "Settlement failed");
    }

    return res.data;
  } catch (err) {
    const message =
      err?.details ||
      err?.message ||
      "Unable to settle cleaner. Please try again.";

    console.error("settleCleaner error:", err);
    throw new Error(message);
  }
}