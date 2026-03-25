import React, { useEffect, useState } from "react";
import { getCleanerPerformance } from "../services/cleanerPerformanceService";
import "../admin.css";

/**
 * ===============================
 * CLEANER PERFORMANCE DASHBOARD
 * ===============================
 *
 * Service-only metrics from analytics engine
 */

export default function CleanerPerformance() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const result = await getCleanerPerformance();
        if (!mounted) return;
        setData(result);
      } catch (err) {
        console.error("Cleaner performance error:", err);
        if (mounted) setError("Failed to load cleaner performance.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <p className="page-container">Loading cleaner performance…</p>;
  }

  if (error) {
    return (
      <div className="page-container">
        <h1 className="page-title">Cleaner Performance</h1>
        <p style={{ color: "red" }}>{error}</p>
      </div>
    );
  }

  const gradeColor = (score) => {
    if (score >= 90) return "#10B981"; // green
    if (score >= 80) return "#22C55E";
    if (score >= 70) return "#F59E0B"; // orange
    if (score >= 60) return "#F97316";
    return "#EF4444"; // red
  };

  const gradeFromScore = (score) => {
    if (score >= 90) return "A";
    if (score >= 80) return "B";
    if (score >= 70) return "C";
    if (score >= 60) return "D";
    return "F";
  };

  return (
    <div className="page-container">
      <h1 className="page-title">Cleaner Performance</h1>

      <div className="orders-box">
        <table>
          <thead>
            <tr>
              <th>Cleaner</th>
              <th>Phone</th>
              <th>Salary</th>
              <th>Total Jobs</th>
              <th>Completed</th>
              <th>Cancelled</th>
              <th>🏠 Onsite</th>
              <th>📦 Pickup</th>
              <th>Avg Time (min)</th>
              <th>Reliability</th>
              <th>Grade</th>
            </tr>
          </thead>

          <tbody>
            {data.map((c) => {
              const color = gradeColor(c.reliabilityScore);
              const grade = gradeFromScore(c.reliabilityScore);

              return (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.phone}</td>
                  <td>{c.monthlySalary} AED</td>
                  <td>{c.totalJobs}</td>
                  <td>{c.completedJobs}</td>
                  <td>{c.cancelledJobs}</td>
                  <td>{c.onsiteJobs}</td>
                  <td>{c.pickupJobs}</td>
                  <td>{c.avgCompletionTime || "—"}</td>
                  <td style={{ color, fontWeight: 700 }}>
                    {c.reliabilityScore}%
                  </td>
                  <td style={{ color, fontWeight: 800 }}>{grade}</td>
                </tr>
              );
            })}

            {data.length === 0 && (
              <tr>
                <td colSpan="11" className="no-records">
                  No cleaners found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
