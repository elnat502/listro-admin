import {
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

/**
 * 💸 APPLY CLEANER PENALTY — PRODUCTION LOCKED
 *
 * Features:
 * - Monthly payroll (YYYY-MM)
 * - Auto-create payroll
 * - Prevents editing locked months
 * - Prevents negative salary
 * - Logs every penalty
 * - Tracks: late / absent / reject / cancel
 */

export async function applyPenalty(
  cleanerId,
  month,
  type,
  amount,
  reason = ""
) {
  if (!cleanerId) throw new Error("Missing cleanerId");
  if (!month) throw new Error("Missing month");
  if (!amount || amount <= 0) throw new Error("Invalid penalty amount");

  const payrollRef = doc(db, "cleaners", cleanerId, "payroll", month);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(payrollRef);

    // 🔒 Block edits if payroll is locked
    if (snap.exists() && snap.data().locked === true) {
      throw new Error("Payroll month is locked. Penalties cannot be added.");
    }

    // 🧾 Auto-create payroll if missing
    if (!snap.exists()) {
      tx.set(payrollRef, {
        cleanerId,
        month,
        baseSalary: 2500, // 👈 default, can be customized per cleaner
        penalties: 0,
        bonus: 0,
        netSalary: 2500,
        lateCount: 0,
        absentCount: 0,
        rejectedJobs: 0,
        cancelledJobs: 0,   // 🔥 NEW
        locked: false,
        createdAt: serverTimestamp(),
      });
    }

    const data = snap.exists()
      ? snap.data()
      : {
          baseSalary: 2500,
          penalties: 0,
          bonus: 0,
          lateCount: 0,
          absentCount: 0,
          rejectedJobs: 0,
          cancelledJobs: 0,
        };

    const base = Number(data.baseSalary || 0);
    const bonus = Number(data.bonus || 0);
    const currentPenalties = Number(data.penalties || 0);

    const penalties = currentPenalties + amount;
    const netSalary = Math.max(base - penalties + bonus, 0);

    const updates = {
      penalties,
      netSalary,
      updatedAt: serverTimestamp(),
    };

    // 📊 Counters
    if (type === "late") updates.lateCount = (data.lateCount || 0) + 1;
    if (type === "absent") updates.absentCount = (data.absentCount || 0) + 1;
    if (type === "reject") updates.rejectedJobs = (data.rejectedJobs || 0) + 1;
    if (type === "cancel") updates.cancelledJobs = (data.cancelledJobs || 0) + 1; // 🔥 NEW

    tx.update(payrollRef, updates);

    // 🧾 Immutable audit log
    const logRef = doc(
      db,
      "cleaners",
      cleanerId,
      "payroll",
      month,
      "logs",
      `${Date.now()}`
    );

    tx.set(logRef, {
      type,
      amount,
      reason,
      at: serverTimestamp(),
    });
  });

  return true;
}
