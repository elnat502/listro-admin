import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";

export async function addBonus(cleanerId, month, amount, reason) {
  if (!cleanerId || !month || !amount) throw new Error("Missing data");

  const payrollRef = doc(db, "cleaners", cleanerId, "payroll", month);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(payrollRef);
    if (!snap.exists()) throw new Error("Payroll not initialized");

    const data = snap.data();

    const newBonus = Number(data.bonus || 0) + amount;
    const base = Number(data.baseSalary || 0);
    const penalties = Number(data.penalties || 0);

    const netSalary = base - penalties + newBonus;

    tx.update(payrollRef, {
      bonus: newBonus,
      netSalary,
      updatedAt: serverTimestamp(),
    });

    tx.set(doc(payrollRef, "logs", `${Date.now()}`), {
      type: "bonus",
      amount,
      reason,
      at: serverTimestamp(),
    });
  });
}
