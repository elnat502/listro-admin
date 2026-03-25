import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../config/firebase";
import "../admin.css";

/**
 * ===============================
 * 💳 CASH RECONCILIATION (ENTERPRISE)
 * ===============================
 * Source of truth:
 *  - companyLedger (COD entries only)
 *  - cleaners collection for names
 *
 * Matches Uber / Careem / Talabat accounting
 */

export default function Reconciliation() {
  const [ledger, setLedger] = useState([]);
  const [cleaners, setCleaners] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ===============================
     LOAD COMPANY LEDGER (COD ONLY)
  =============================== */
  useEffect(() => {
    const q = query(
      collection(db, "companyLedger"),
      where("type", "==", "cod")
    );

    const unsub = onSnapshot(q, (snap) => {
      setLedger(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => unsub();
  }, []);

  /* ===============================
     LOAD CLEANERS (FOR NAME LOOKUP)
  =============================== */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "cleaners"), (snap) => {
      setCleaners(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  if (loading) {
    return <div className="page-container">Loading reconciliation…</div>;
  }

  /* ===============================
     BUILD CLEANER MAP
  =============================== */
  const cleanerMap = {};
  cleaners.forEach((c) => {
    cleanerMap[c.id] = c.name || "Unknown";
  });

  /* ===============================
     CALCULATIONS (SINGLE SOURCE OF TRUTH)
  =============================== */
  let totalCollected = 0;
  let cashSettledToCompany = 0;
  let stillOwedByCleaners = 0;

  ledger.forEach((e) => {
    const amount = Number(e.amount || 0);

    totalCollected += amount;

    if (e.status === "settled") {
      cashSettledToCompany += amount;
    }

    if (e.status === "held_by_cleaner") {
      stillOwedByCleaners += amount;
    }
  });

  const cashOnHand = cashSettledToCompany;

  const mismatch =
    Math.abs(totalCollected - (cashSettledToCompany + stillOwedByCleaners)) >
    0.01;

  /* ===============================
     CLEANER BREAKDOWN + CASH AGING
  =============================== */
  const cleanerOwed = {};
  ledger.forEach((e) => {
    if (e.status !== "held_by_cleaner") return;
    if (!e.cleanerId) return;

    const amount = Number(e.amount || 0);
    const createdAt =
      e.createdAt?.toDate?.() ||
      (e.createdAt?.seconds
        ? new Date(e.createdAt.seconds * 1000)
        : null);

    if (!cleanerOwed[e.cleanerId]) {
      cleanerOwed[e.cleanerId] = {
        name: cleanerMap[e.cleanerId] || e.cleanerName || "Unknown",
        amount: 0,
        oldestHeldAt: createdAt,
      };
    }

    cleanerOwed[e.cleanerId].amount += amount;

    if (
      createdAt &&
      (!cleanerOwed[e.cleanerId].oldestHeldAt ||
        createdAt < cleanerOwed[e.cleanerId].oldestHeldAt)
    ) {
      cleanerOwed[e.cleanerId].oldestHeldAt = createdAt;
    }
  });

  return (
    <div className="page-container">
      <h1 className="page-title">💳 Cash Reconciliation</h1>

      {/* ===============================
           SUMMARY
      =============================== */}
      <div className="stats-grid">
        <div className="stat-box green">
          <h3>Total Cash Collected</h3>
          <p>{totalCollected} AED</p>
        </div>

        <div className="stat-box blue">
          <h3>Cash Settled to Company</h3>
          <p>{cashSettledToCompany} AED</p>
        </div>

        <div className="stat-box red">
          <h3>Still Owed by Cleaners</h3>
          <p>{stillOwedByCleaners} AED</p>
        </div>

        <div className="stat-box purple">
          <h3>Company Cash On Hand</h3>
          <p>{cashOnHand} AED</p>
        </div>
      </div>

      {/* ===============================
           SAFETY CHECK
      =============================== */}
      <div
        style={{
          marginTop: 30,
          padding: 16,
          borderRadius: 8,
          background: mismatch ? "#FEE2E2" : "#ECFDF5",
          color: mismatch ? "#991B1B" : "#065F46",
          fontWeight: 600,
        }}
      >
        {mismatch ? (
          <>
            ⚠️ Reconciliation mismatch detected
            <br />
            Collected ≠ Settled + Owed
          </>
        ) : (
          <>✅ Reconciliation balanced — All cash accounted for</>
        )}
      </div>

      {/* ===============================
           CLEANER BREAKDOWN
      =============================== */}
      <h2 style={{ marginTop: 40 }}>🧹 Cleaner Balances</h2>

      <table className="table">
        <thead>
          <tr>
            <th>Cleaner</th>
            <th>Cash Owed</th>
            <th>Oldest Held</th>
            <th>Days Held</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(cleanerOwed).length === 0 && (
            <tr>
              <td colSpan="5" style={{ textAlign: "center", color: "#6B7280" }}>
                No outstanding balances
              </td>
            </tr>
          )}

          {Object.entries(cleanerOwed).map(([cid, c]) => {
            const oldest = c.oldestHeldAt;
            const daysHeld = oldest
              ? Math.floor((Date.now() - oldest.getTime()) / (1000 * 60 * 60 * 24))
              : 0;

            const statusLabel =
              daysHeld >= 4 ? "Critical" : daysHeld >= 2 ? "Warning" : "OK";

            const statusColor =
              daysHeld >= 4 ? "#DC2626" : daysHeld >= 2 ? "#F59E0B" : "#16A34A";

            return (
              <tr key={cid}>
                <td>{c.name}</td>
                <td>{c.amount} AED</td>
                <td>{oldest ? oldest.toLocaleString() : "—"}</td>
                <td style={{ fontWeight: 700 }}>{daysHeld}</td>
                <td>
                  <span style={{ color: statusColor, fontWeight: 800 }}>
                    {statusLabel}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
