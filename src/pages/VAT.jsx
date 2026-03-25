import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../config/firebase";
import "../admin.css";

// PDF EXPORT LIBRARIES
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * ===============================
 * 📄 VAT REPORT (REAL MONEY + PDF EXPORT + LOGO)
 * ===============================
 * Source of truth:
 * → companyLedger
 *
 * VAT = 5% of settled COD revenue
 */

export default function VAT() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "companyLedger"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Only settled COD is taxable
  const taxable = rows
    .filter((r) => r.type === "cod" && r.status === "settled")
    .reduce((s, r) => s + Number(r.amount || 0), 0);

  const vat = taxable * 0.05;

  /* ===============================
     📄 EXPORT VAT REPORT TO PDF (WITH LOGO)
  =============================== */
  const exportVatPDF = () => {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString();

    // 🟢 LOGO WIRING (PROFESSIONAL)
    const logo = new Image();

    // Make sure your logo exists at:
    // public/images/listro-logo.png
    logo.src = "/images/listro-logo.png";

    logo.onload = () => {
      try {
        // ADD LOGO
        doc.addImage(logo, "PNG", 14, 10, 35, 22);

        // HEADER
        doc.setFontSize(18);
        doc.text("LISTRO – VAT REPORT", 55, 22);

        doc.setFontSize(11);
        doc.text(`Generated on: ${today}`, 55, 30);

        // SUMMARY
        doc.setFontSize(12);
        doc.text(`Taxable Revenue: ${taxable.toFixed(2)} AED`, 14, 45);
        doc.text(`VAT (5%): ${vat.toFixed(2)} AED`, 14, 51);

        // TABLE DATA
        const tableColumn = [
          "Date",
          "Order",
          "Amount",
          "VAT (5%)",
        ];

        const tableRows = rows
          .filter((r) => r.type === "cod" && r.status === "settled")
          .map((r) => [
            r.createdAt?.toDate
              ? r.createdAt.toDate().toLocaleDateString()
              : "—",
            r.orderId ? r.orderId.slice(0, 6) : "—",
            `${r.amount} AED`,
            `${(r.amount * 0.05).toFixed(2)} AED`,
          ]);

        autoTable(doc, {
          head: [tableColumn],
          body: tableRows,
          startY: 60,
          styles: { fontSize: 10 },
          headStyles: { fillColor: [15, 23, 42] },
        });

        doc.save(`listro_vat_report_${today}.pdf`);
      } catch (err) {
        console.error("VAT PDF Generation Error:", err);
      }
    };

    // Fallback if logo fails
    logo.onerror = () => {
      console.warn("Logo failed to load – generating VAT PDF without logo");

      doc.setFontSize(18);
      doc.text("LISTRO – VAT REPORT", 14, 20);

      doc.setFontSize(11);
      doc.text(`Generated on: ${today}`, 14, 28);

      autoTable(doc, {
        head: [["Date", "Order", "Amount", "VAT (5%)"]],
        body: rows
          .filter((r) => r.type === "cod" && r.status === "settled")
          .map((r) => [
            r.createdAt?.toDate
              ? r.createdAt.toDate().toLocaleDateString()
              : "—",
            r.orderId ? r.orderId.slice(0, 6) : "—",
            `${r.amount} AED`,
            `${(r.amount * 0.05).toFixed(2)} AED`,
          ]),
        startY: 40,
      });

      doc.save(`listro_vat_report_${today}.pdf`);
    };
  };

  return (
    <div className="page-container">
      <h1 className="page-title">📄 VAT Report</h1>

      {/* EXPORT BUTTON */}
      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={exportVatPDF}
          style={{
            background: "#0F172A",
            color: "white",
            padding: "10px 16px",
            borderRadius: "8px",
            fontWeight: "700",
            cursor: "pointer",
          }}
        >
          📄 Export VAT PDF
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-box green">
          <h3>Taxable Revenue</h3>
          <p>{taxable.toFixed(2)} AED</p>
        </div>

        <div className="stat-box red">
          <h3>VAT (5%)</h3>
          <p>{vat.toFixed(2)} AED</p>
        </div>
      </div>

      <h2 style={{ marginTop: 30 }}>🧾 Tax Ledger</h2>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Order</th>
              <th>Amount</th>
              <th>VAT</th>
            </tr>
          </thead>

          <tbody>
            {rows
              .filter((r) => r.type === "cod" && r.status === "settled")
              .map((r) => (
                <tr key={r.id}>
                  <td>{r.createdAt?.toDate().toLocaleString()}</td>
                  <td>{r.orderId?.slice(0, 6)}</td>
                  <td>{r.amount} AED</td>
                  <td>{(r.amount * 0.05).toFixed(2)} AED</td>
                </tr>
              ))}

            {taxable === 0 && (
              <tr>
                <td colSpan="4" className="no-records">
                  No taxable transactions yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
