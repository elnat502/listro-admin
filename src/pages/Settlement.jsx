import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db, functions } from "../config/firebase";
import { httpsCallable } from "firebase/functions";
import "../admin.css";

/**
 * ===============================
 * 🧾 CLEANER CASH SETTLEMENT
 * ===============================
 * Source of truth:
 * cleaners.cashOwedToCompany
 *
 * This page moves REAL CASH into companyLedger
 */

export default function Settlement() {
  const [cleaners, setCleaners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settlingId, setSettlingId] = useState(null);

  const settleCleanerFn = httpsCallable(functions, "settleCleaner");

  /* ===============================
     LIVE CLEANERS WHO OWE CASH
  =============================== */
  useEffect(() => {
    const q = query(
      collection(db, "cleaners"),
      where("cashOwedToCompany", ">", 0)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setCleaners(
          snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }))
        );
        setLoading(false);
      },
      (err) => {
        console.error("Snapshot error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  /* ===============================
     SETTLE CLEANER
  =============================== */
  const handleSettle = async (cleaner) => {
    const amount = Number(cleaner?.cashOwedToCompany || 0);

    if (amount <= 0) return;

    const confirmMsg = `Confirm settlement:\n${
      cleaner?.name || "Cleaner"
    } hands over ${amount} AED to Listro`;

    if (!window.confirm(confirmMsg)) return;

    try {
      setSettlingId(cleaner.id);

      await settleCleanerFn({
        cleanerId: cleaner.id,
        // optional: send amount if your backend supports partial settlement
        // amount,
      });

      alert("Cash successfully settled 💰");
    } catch (e) {
      console.error("Settlement error:", e);
      alert(e.message || "Settlement failed");
    } finally {
      setSettlingId(null);
    }
  };

  /* ===============================
     UI
  =============================== */
  if (loading) {
    return <div className="page-container">Loading settlements…</div>;
  }

  return (
    <div className="page-container">
      <h1 className="page-title">🧾 Cleaner Settlement</h1>

      {cleaners.length === 0 ? (
        <p>All cleaners are fully settled 🎉</p>
      ) : (
        <div className="orders-box">
          <table>
            <thead>
              <tr>
                <th>Cleaner</th>
                <th>Cash Owed</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {cleaners.map((c) => (
                <tr key={c.id}>
                  <td>{c.name || "Unnamed"}</td>

                  <td style={{ color: "#DC2626", fontWeight: 700 }}>
                    {Number(c.cashOwedToCompany || 0)} AED
                  </td>

                  <td>
                    <button
                      className="btn btn-primary"
                      disabled={settlingId === c.id}
                      onClick={() => handleSettle(c)}
                    >
                      {settlingId === c.id ? "Processing..." : "💰 Settle"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}