import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
  getDoc,
  getDocs, // ✅ STEP 5
} from "firebase/firestore";
import { db, functions } from "../config/firebase";
import { httpsCallable } from "firebase/functions";
import "../admin.css";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * ===============================
 * 🧾 CLEANER PAYROLL (ADMIN SAFE)
 * ===============================
 */

export default function Payroll() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [totalEarned, setTotalEarned] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalOwed, setTotalOwed] = useState(0);

  // STEP 4 — confirm payroll
  const [confirmData, setConfirmData] = useState(null);
  const [processing, setProcessing] = useState(false);

  // ✅ STEP 5 — payroll history
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyCleaner, setHistoryCleaner] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  /* ===============================
     🔥 STEP 1 — LIVE PAYROLL FROM CLEANERS
     (SINGLE SOURCE OF TRUTH)
  =============================== */
  useEffect(() => {
    let unsub = () => {};

    try {
      const q = query(
        collection(db, "cleaners"),
        orderBy("lastUpdatedAt", "desc")
      );

      unsub = onSnapshot(
        q,
        (snap) => {
          let earned = 0;
          let paid = 0;

          const list = snap.docs.map((d) => {
            const s = d.data();

            const monthlySalary = Number(s.monthlySalary || 0);
            const totalPaid = Number(s.totalPaid || 0);

            // STEP 6 — month lock awareness
            const currentMonth = new Date().toISOString().slice(0, 7);
            const isLocked = s.lastPaidMonth === currentMonth;

            const balance = Math.max(
              isLocked ? 0 : monthlySalary - totalPaid,
              0
            );

            earned += monthlySalary;
            paid += totalPaid;

            return {
              id: d.id,
              cleanerId: d.id,
              cleanerName: s.name || "—",
              monthlySalary,
              totalPaid,
              balance,
              isLocked, // ✅ STEP 6
            };
          });

          setRows(list);
          setTotalEarned(earned);
          setTotalPaid(paid);
          setTotalOwed(Math.max(earned - paid, 0));
          setLoading(false);
        },
        (err) => {
          console.error("Payroll snapshot error:", err);
          setError("You do not have permission to view payroll.");
          setLoading(false);
        }
      );
    } catch (err) {
      console.error("Payroll init error:", err);
      setError("Failed to load payroll.");
      setLoading(false);
    }

    return () => unsub();
  }, []);

  /* ===============================
     STEP 4 — OPEN CONFIRM MODAL
  =============================== */
  const handleProcessPayroll = async (row) => {
    const month = new Date().toISOString().slice(0, 7);

    try {
      const cleanerSnap = await getDoc(
        doc(db, "cleaners", row.cleanerId)
      );

      if (!cleanerSnap.exists()) {
        alert("Cleaner profile not found");
        return;
      }

      const c = cleanerSnap.data();

      if (c.lastPaidMonth === month) {
        alert("Payroll already processed for this month");
        return;
      }

      setConfirmData({
        cleanerId: row.cleanerId,
        cleanerName: c.name || row.cleanerId,
        month,
        monthlySalary: Number(c.monthlySalary || 0),
        advance: Number(c.monthAdvanceDeduction || 0),
        penalties: Number(c.monthPenalties || 0),
      });
    } catch {
      alert("Failed to load cleaner data");
    }
  };

  /* ===============================
     ✅ STEP 5 — OPEN PAYROLL HISTORY
  =============================== */
  const openHistory = async (row) => {
    setHistoryCleaner(row.cleanerName);
    setHistoryOpen(true);
    setHistoryLoading(true);

    try {
      const snap = await getDocs(
        query(
          collection(db, "cleaners", row.cleanerId, "payroll"),
          orderBy("month", "desc")
        )
      );

      setHistoryRows(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );
    } catch {
      alert("Failed to load payroll history");
    } finally {
      setHistoryLoading(false);
    }
  };

  /* ===============================
     🆕 STEP 7 — VIEW PAYSLIP
  =============================== */
  const handleViewPayslip = async (row) => {
    try {
      const cleanerSnap = await getDoc(
        doc(db, "cleaners", row.cleanerId)
      );
      if (!cleanerSnap.exists()) {
        alert("Cleaner not found");
        return;
      }

      const payrollSnap = await getDocs(
        query(
          collection(db, "cleaners", row.cleanerId, "payroll"),
          orderBy("createdAt", "desc")
        )
      );

      if (payrollSnap.empty) {
        alert("No payroll record found");
        return;
      }

      generatePayslipPDF(
        cleanerSnap.data(),
        payrollSnap.docs[0].data(),
        row.cleanerId
      );
    } catch {
      alert("Failed to generate payslip");
    }
  };

  /* ===============================
     📄 STEP 7 — PAYSLIP PDF
  =============================== */
  const generatePayslipPDF = (cleaner, payroll, cleanerId) => {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("LISTRO CLEANING SERVICES", 14, 20);
    doc.setFontSize(12);
    doc.text("Cleaner Payslip", 14, 30);

    doc.setFontSize(10);
    doc.text(`Cleaner: ${cleaner.name}`, 14, 42);
    doc.text(`Cleaner ID: ${cleanerId}`, 14, 48);
    doc.text(`Month: ${payroll.month}`, 14, 54);

    autoTable(doc, {
      startY: 65,
      head: [["Description", "Amount (AED)"]],
      body: [
        ["Base Salary", payroll.salary],
        ["Advance Deduction", payroll.advanceDeducted],
        ["Penalties", payroll.penaltiesDeducted],
        ["Net Salary Paid", payroll.amount],
      ],
    });

    doc.save(`Payslip_${cleaner.name}_${payroll.month}.pdf`);
  };

  /* ===============================
     📄 EXPORT PAYROLL PDF
  =============================== */
  const exportPayrollPDF = () => {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString();

    doc.setFontSize(18);
    doc.text("LISTRO – CLEANER PAYROLL REPORT", 14, 20);

    autoTable(doc, {
      startY: 30,
      head: [["Cleaner", "Monthly Salary", "Total Paid", "Balance"]],
      body: rows.map((r) => [
        r.cleanerName,
        `${r.monthlySalary} AED`,
        `${r.totalPaid} AED`,
        `${r.balance} AED`,
      ]),
    });

    doc.save(`listro_payroll_${today}.pdf`);
  };

  if (loading) return <div className="page-container">Loading payroll…</div>;
  if (error) return <div className="page-container">🚫 {error}</div>;

  return (
    <div className="page-container">
      <h1 className="page-title">🧾 Cleaner Payroll</h1>

      <button onClick={exportPayrollPDF}>
        📄 Export Payroll PDF
      </button>

      <div className="stats-grid">
        <div>Total Salary: {totalEarned} AED</div>
        <div>Total Paid: {totalPaid} AED</div>
        <div>Total Outstanding: {totalOwed} AED</div>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Cleaner</th>
            <th>Monthly Salary</th>
            <th>Total Paid</th>
            <th>Balance</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.cleanerName}</td>
              <td>{r.monthlySalary} AED</td>
              <td>{r.totalPaid} AED</td>
              <td>{r.balance} AED</td>
              <td>
                <button
                  disabled={r.balance <= 0 || r.isLocked}
                  onClick={() => handleProcessPayroll(r)}
                >
                  {r.isLocked ? "Locked" : "Process"}
                </button>

                <button
                  style={{ marginLeft: 6 }}
                  onClick={() => openHistory(r)}
                >
                  History
                </button>

                <button
                  style={{ marginLeft: 6 }}
                  disabled={r.totalPaid <= 0}
                  onClick={() => handleViewPayslip(r)}
                >
                  Payslip
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ===============================
          STEP 4 — CONFIRM PAYROLL MODAL
      =============================== */}
      {confirmData && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Confirm Payroll</h3>

            <p><b>Cleaner:</b> {confirmData.cleanerName}</p>
            <p><b>Month:</b> {confirmData.month}</p>

            <p>
              <b>
                Net Pay:{" "}
                {Math.max(
                  confirmData.monthlySalary -
                    confirmData.advance -
                    confirmData.penalties,
                  0
                )} AED
              </b>
            </p>

            <button
              disabled={processing}
              onClick={async () => {
                try {
                  setProcessing(true);
                  await httpsCallable(
                    functions,
                    "processMonthlyPayroll"
                  )({
                    cleanerId: confirmData.cleanerId,
                    month: confirmData.month,
                  });
                  alert("Payroll processed");
                  setConfirmData(null);
                } finally {
                  setProcessing(false);
                }
              }}
            >
              Confirm & Pay
            </button>

            <button onClick={() => setConfirmData(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* STEP 5 — HISTORY MODAL (UNCHANGED) */}
      {historyOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Payroll History — {historyCleaner}</h3>

            {historyLoading ? (
              <p>Loading…</p>
            ) : historyRows.length === 0 ? (
              <p>No payroll records</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Salary</th>
                    <th>Advance</th>
                    <th>Penalties</th>
                    <th>Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.month}</td>
                      <td>{r.salary} AED</td>
                      <td>{r.advanceDeducted} AED</td>
                      <td>{r.penaltiesDeducted} AED</td>
                      <td>{r.amount} AED</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <button onClick={() => setHistoryOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}