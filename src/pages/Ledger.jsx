import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  getDocs,
} from "firebase/firestore";
import { db } from "../config/firebase";

/**
 * ===============================
 * COMPANY LEDGER — SOURCE OF TRUTH
 * ===============================
 */

export default function Ledger() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllLedger();
  }, []);

  const loadAllLedger = async () => {
    try {
      // 🔹 Cleaning Ledger
      const cleaningSnap = await getDocs(collection(db, "ledger"));

      // 🔹 Shop Ledger
      const shopSnap = await getDocs(collection(db, "companyLedger"));

      const cleaning = cleaningSnap.docs.map((d) => ({
        id: d.id,
        sourceType: "cleaning",
        ...d.data(),
      }));

      const shop = shopSnap.docs.map((d) => ({
        id: d.id,
        sourceType: "shop",
        ...d.data(),
      }));

      // 🔥 MERGE
      const combined = [...cleaning, ...shop];

      // 🔥 SORT
      combined.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });

      setRows(combined);
      setLoading(false);
    } catch (err) {
      console.error("Ledger load error:", err);
      setLoading(false);
    }
  };

  const formatDate = (t) => {
    if (!t) return "—";
    if (t.toDate) return t.toDate().toLocaleString();
    return "—";
  };

  return (
    <div className="page-container">
      <h1 className="page-title">📒 Company Ledger</h1>

      {loading ? (
        <p>Loading…</p>
      ) : rows.length === 0 ? (
        <p>No ledger entries yet</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Source</th>
              <th>Cleaner</th>
              <th>Order</th>
              <th>Status</th>
              <th>Amount</th>
              <th>Flow</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{formatDate(r.createdAt)}</td>

                <td>{r.type || "—"}</td>

                {/* ✅ NEW SOURCE COLUMN */}
                <td>
                  {r.sourceType === "shop" ? "🛍 Shop" : "🧼 Cleaning"}
                </td>

                <td>{r.cleanerName || r.cleanerId || "—"}</td>

               <td>
  {r.orderId
    ? r.orderId.slice(0, 6)
    : r.type === "salary"
    ? "Salary"
    : r.type === "payout"
    ? "Withdrawal"
    : "—"}
</td>

                <td>{r.status || "settled"}</td>

                <td style={{ fontWeight: 700 }}>
                  {r.amount || 0} AED
                </td>

                <td
                  style={{
                    fontWeight: 700,
                    color:
                      r.flow === "OUT"
                        ? "#dc2626"
                        : "#16A34A",
                  }}
                >
                  {r.flow || "IN"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}