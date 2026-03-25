import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../config/firebase";
import "../admin.css";

// PDF EXPORT LIBRARIES
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * ===============================
 * 📊 COMPANY PROFIT (BANK-GRADE + PDF EXPORT)
 * ===============================
 * Source of truth:
 *  → companyLedger
 *
 * Rules:
 * - Only SETTLED COD is revenue
 * - Held COD = money still with cleaners
 * - Cleaner salaries are NOT cash until paid
 */

export default function Profit() {
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "companyLedger"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setLedger(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => unsub();
  }, []);

  /* ===============================
     💰 FINANCIAL CALCULATIONS
  =============================== */

  const settled = ledger.filter(
    (r) => r.type === "cod" && r.status === "settled"
  );

  const held = ledger.filter(
    (r) => r.type === "cod" && r.status === "held_by_cleaner"
  );

  const revenue = settled.reduce((s, r) => s + Number(r.amount || 0), 0);
  const heldByCleaners = held.reduce((s, r) => s + Number(r.amount || 0), 0);
  const cashOnHand = revenue;

  const grossProfit = revenue;

  /* ===============================
     📄 EXPORT PROFIT REPORT TO PDF (WITH LOGO)
  =============================== */

  const exportProfitPDF = () => {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString();

    // 🟢 PROFESSIONAL LOGO LOADING
    const logo = new Image();

    // Make sure your logo is placed at:
    // public/images/listro-logo.png
    logo.src = "/images/listro-logo.png";

    logo.onload = () => {
      try {
        // ADD LOGO
        doc.addImage(logo, "PNG", 14, 10, 35, 22);

        // HEADER
        doc.setFontSize(18);
        doc.text("LISTRO – PROFIT REPORT", 55, 22);

        doc.setFontSize(11);
        doc.text(`Generated on: ${today}`, 55, 30);

        // SUMMARY SECTION
        doc.setFontSize(12);
        doc.text(`Revenue (Settled COD): ${revenue} AED`, 14, 45);
        doc.text(`Held by Cleaners: ${heldByCleaners} AED`, 14, 51);
        doc.text(`Cash on Hand: ${cashOnHand} AED`, 14, 57);
        doc.text(`Gross Profit: ${grossProfit} AED`, 14, 63);

        // TABLE DATA
        const tableColumn = [
          "Date",
          "Cleaner",
          "Order",
          "Status",
          "Amount",
          "Flow",
        ];

        const tableRows = ledger.map((r) => [
          r.createdAt?.toDate
            ? r.createdAt.toDate().toLocaleDateString()
            : "—",
          r.cleanerName || r.cleanerId || "—",
          r.orderId ? r.orderId.slice(0, 6) : "—",
          r.status || "—",
          `${r.amount || 0} AED`,
          r.status === "settled" ? "IN" : "PENDING",
        ]);

        autoTable(doc, {
          head: [tableColumn],
          body: tableRows,
          startY: 70,
          styles: { fontSize: 10 },
          headStyles: { fillColor: [15, 23, 42] },
        });

        doc.save(`listro_profit_report_${today}.pdf`);
      } catch (err) {
        console.error("PDF Generation Error:", err);
      }
    };

    // Fallback if logo fails
    logo.onerror = () => {
      console.warn("Logo failed to load – generating PDF without logo");

      doc.setFontSize(18);
      doc.text("LISTRO – PROFIT REPORT", 14, 20);

      doc.setFontSize(11);
      doc.text(`Generated on: ${today}`, 14, 28);

      autoTable(doc, {
        head: [["Date", "Cleaner", "Order", "Status", "Amount", "Flow"]],
        body: ledger.map((r) => [
          r.createdAt?.toDate
            ? r.createdAt.toDate().toLocaleDateString()
            : "—",
          r.cleanerName || r.cleanerId || "—",
          r.orderId ? r.orderId.slice(0, 6) : "—",
          r.status || "—",
          `${r.amount || 0} AED`,
          r.status === "settled" ? "IN" : "PENDING",
        ]),
        startY: 40,
      });

      doc.save(`listro_profit_report_${today}.pdf`);
    };
  };

  if (loading) {
    return <div className="page-container">Loading profit…</div>;
  }

  return (
    <div className="page-container">
      <h1 className="page-title">📊 Company Profit</h1>

      {/* EXPORT BUTTON */}
      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={exportProfitPDF}
          style={{
            background: "#0F172A",
            color: "white",
            padding: "10px 16px",
            borderRadius: "8px",
            fontWeight: "700",
            cursor: "pointer",
          }}
        >
          📄 Export Profit PDF
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-box green">
          <h3>Revenue (Settled COD)</h3>
          <p>{revenue} AED</p>
        </div>

        <div className="stat-box purple">
          <h3>Cash on Hand</h3>
          <p>{cashOnHand} AED</p>
        </div>

        <div className="stat-box blue">
          <h3>Held by Cleaners</h3>
          <p>{heldByCleaners} AED</p>
        </div>

        <div className="stat-box red">
          <h3>Gross Profit</h3>
          <p>{grossProfit} AED</p>
        </div>
      </div>

      <h2 style={{ marginTop: 40 }}>🧾 Company Ledger</h2>

      {ledger.length === 0 ? (
        <p>No ledger entries yet</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Cleaner</th>
              <th>Order</th>
              <th>Status</th>
              <th>Amount</th>
              <th>Flow</th>
            </tr>
          </thead>

          <tbody>
            {ledger.map((r) => (
              <tr key={r.id}>
                <td>
                  {r.createdAt?.toDate
                    ? r.createdAt.toDate().toLocaleString()
                    : "—"}
                </td>
                <td>{r.cleanerName || r.cleanerId || "—"}</td>
                <td>{r.orderId ? r.orderId.slice(0, 6) : "—"}</td>
                <td>{r.status || "—"}</td>
                <td style={{ fontWeight: 700 }}>{r.amount || 0} AED</td>
                <td
                  style={{
                    fontWeight: 700,
                    color: r.status === "settled" ? "#16A34A" : "#DC2626",
                  }}
                >
                  {r.status === "settled" ? "IN" : "PENDING"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
