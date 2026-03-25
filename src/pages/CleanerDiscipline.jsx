import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";
import "../admin.css";

const CURRENT_MONTH = new Date().toISOString().slice(0, 7); // "2025-12"

export default function CleanerDiscipline() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const cleanersSnap = await getDocs(collection(db, "cleaners"));

      const list = [];

      for (const cleanerDoc of cleanersSnap.docs) {
        const cleaner = cleanerDoc.data();
        const payrollRef = collection(
          db,
          "cleaners",
          cleanerDoc.id,
          "payroll"
        );

        const payrollSnap = await getDocs(payrollRef);
        const monthDoc = payrollSnap.docs.find(
          (d) => d.id === CURRENT_MONTH
        );

        const p = monthDoc?.data() || {};

        const penalties = Number(p.penalties || 0);
        const netSalary = Number(p.netSalary || 0);
        const late = Number(p.lateCount || 0);
        const absent = Number(p.absentCount || 0);
        const rejected = Number(p.rejectedJobs || 0);

        let risk = "🟢 GOOD";
        if (penalties >= 300 || rejected >= 3) risk = "🟡 WARNING";
        if (penalties >= 600 || rejected >= 5 || absent >= 2) risk = "🔴 FIRE";

        list.push({
          id: cleanerDoc.id,
          name: cleaner.name,
          phone: cleaner.phone,
          penalties,
          netSalary,
          late,
          absent,
          rejected,
          risk,
        });
      }

      setRows(list);
      setLoading(false);
    };

    load();
  }, []);

  return (
    <div className="page-container">
      <h1 className="page-title">🧹 Cleaner Discipline — {CURRENT_MONTH}</h1>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <table className="orders-box">
          <thead>
            <tr>
              <th>Cleaner</th>
              <th>Late</th>
              <th>Absent</th>
              <th>Rejected</th>
              <th>Penalties</th>
              <th>Net Salary</th>
              <th>Risk</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>
                  <b>{c.name}</b>
                  <br />
                  <small>{c.phone}</small>
                </td>
                <td>{c.late}</td>
                <td>{c.absent}</td>
                <td>{c.rejected}</td>
                <td>{c.penalties} AED</td>
                <td>{c.netSalary} AED</td>
                <td style={{ fontWeight: 700 }}>{c.risk}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
