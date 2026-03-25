import * as XLSX from "xlsx";
import { db } from "../config/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import "../admin.css";

export default function SettlementHistory() {
  const [rows, setRows] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [cleanerFilter, setCleanerFilter] = useState("ALL");

  // ✅ NEW — DATE FILTER
  const [dateFilter, setDateFilter] = useState("ALL");

  // ✅ NEW — ADMIN MAP
  const [adminsMap, setAdminsMap] = useState({});

  /* ===============================
     LOAD DATA
  =============================== */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "cleaners"), (snap) => {
      let list = [];

      snap.docs.forEach((doc) => {
        const data = doc.data();

        if (Array.isArray(data.settlementHistory)) {
          data.settlementHistory.forEach((h, index) => {
            list.push({
              id: doc.id + "_" + index,
              cleanerId: doc.id,
              cleanerName: data.name || "Unknown",
              amount: Number(h.amount || 0),
              createdAt: h.date,
              adminId: h.adminId,
            });
          });
        }
      });

      list.sort((a, b) => {
        const t1 = a.createdAt?.seconds || 0;
        const t2 = b.createdAt?.seconds || 0;
        return t2 - t1;
      });

      setRows(list);
      setFiltered(list);
    });

    return () => unsub();
  }, []);

  /* ===============================
     ✅ NEW — LOAD ADMINS
  =============================== */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "admins"), (snap) => {
      let map = {};

      snap.docs.forEach((doc) => {
        map[doc.id] = doc.data().name || "Admin";
      });

      setAdminsMap(map);
    });

    return () => unsub();
  }, []);

  /* ===============================
     FILTER (OLD)
  =============================== */
  useEffect(() => {
    if (cleanerFilter === "ALL") {
      setFiltered(rows);
    } else {
      setFiltered(rows.filter((r) => r.cleanerId === cleanerFilter));
    }
  }, [cleanerFilter, rows]);

  /* ===============================
     ✅ NEW — COMBINED FILTER
  =============================== */
  useEffect(() => {
    let filteredRows = rows;

    if (cleanerFilter !== "ALL") {
      filteredRows = filteredRows.filter(
        (r) => r.cleanerId === cleanerFilter
      );
    }

    if (dateFilter !== "ALL") {
      const now = new Date();

      filteredRows = filteredRows.filter((r) => {
        if (!r.createdAt?.seconds) return false;

        const d = new Date(r.createdAt.seconds * 1000);
        const diffDays = (now - d) / (1000 * 60 * 60 * 24);

        if (dateFilter === "TODAY") return diffDays < 1;
        if (dateFilter === "7") return diffDays <= 7;
        if (dateFilter === "30") return diffDays <= 30;

        return true;
      });
    }

    setFiltered(filteredRows);
  }, [rows, cleanerFilter, dateFilter]);

  /* ===============================
     STATS
  =============================== */
  const totalSettled = filtered.reduce((s, r) => s + r.amount, 0);

  const todaySettled = filtered.reduce((s, r) => {
    if (!r.createdAt?.seconds) return s;

    const d = new Date(r.createdAt.seconds * 1000);
    const today = new Date();

    if (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    ) {
      return s + r.amount;
    }
    return s;
  }, 0);

  const formatDate = (ts) => {
    if (!ts) return "-";
    return new Date(ts.seconds * 1000).toLocaleString();
  };
const exportToExcel = () => {
  const data = filtered.map((r) => ({
    Date: r.createdAt?.seconds
      ? new Date(r.createdAt.seconds * 1000).toLocaleString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "-",
    Cleaner: r.cleanerName,
    Amount: `${r.amount} AED`,
    Admin: adminsMap[r.adminId] || "Unknown",
  }));

  // ✅ ADD TOTAL ROW HERE (THIS IS THE ONLY CORRECT PLACE)
  data.push({});
  data.push({
    Date: "—",
   Cleaner: "TOTAL (SUMMARY)",
    Amount: `${filtered.reduce((s, r) => s + r.amount, 0)} AED`,
    Admin: "",
  });
const worksheet = XLSX.utils.json_to_sheet(data);

// Make header bold
const range = XLSX.utils.decode_range(worksheet["!ref"]);
for (let C = range.s.c; C <= range.e.c; ++C) {
  const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c: C })];
  if (cell) cell.s = { font: { bold: true } };
}
  // ✅ AUTO COLUMN WIDTH
  worksheet["!cols"] = [
    { wch: 22 },
    { wch: 15 },
    { wch: 12 },
    { wch: 15 },
  ];

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Settlements");

  XLSX.writeFile(
    workbook,
    `settlement_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
};
  /* ===============================
     UI
  =============================== */
  return (
    <div className="page-container">
      <h1 className="page-title">💰 Settlement Dashboard</h1>

      <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
        <div className="card">
          <h3>Total Settled</h3>
          <p>{totalSettled.toFixed(2)} AED</p>
        </div>

        <div className="card">
          <h3>Today</h3>
          <p>{todaySettled.toFixed(2)} AED</p>
        </div>

        <div className="card">
          <h3>Transactions</h3>
          <p>{filtered.length}</p>
        </div>
      </div>

      {/* ===============================
          FILTERS
      =============================== */}
      <div style={{ marginBottom: 20 }}>
        <select
          value={cleanerFilter}
          onChange={(e) => setCleanerFilter(e.target.value)}
        >
          <option value="ALL">All Cleaners</option>
          {[...new Set(rows.map((r) => r.cleanerId))].map((id) => (
            <option key={id} value={id}>
              {rows.find((r) => r.cleanerId === id)?.cleanerName || id}
            </option>
          ))}
        </select>

        {/* ✅ NEW DATE FILTER */}
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          style={{ marginLeft: 10 }}
        >
          <option value="ALL">All Time</option>
          <option value="TODAY">Today</option>
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
        </select>
      </div>
<div style={{ marginBottom: 10 }}>
  <button onClick={exportToExcel} className="btn-primary">
    📄 Export Excel
  </button>
</div>
      <div className="orders-box">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Cleaner</th>
              <th>Amount</th>
              <th>Admin</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>{formatDate(r.createdAt)}</td>

                <td>{r.cleanerName}</td>

                <td style={{ fontWeight: 700 }}>
                  {r.amount.toFixed(2)} AED
                </td>

                <td style={{ fontSize: 12 }}>
                  {adminsMap[r.adminId] || "Unknown"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}