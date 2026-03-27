import React, { useEffect, useState } from "react";
import { getDashboardStats } from "../services/dashboardService";
import "../admin.css";

/* ✅ ADDED — CHART LIBRARY */
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ✅ ADDED — FIRESTORE */
import { collection, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";

/**
 * ===============================
 * LISTRO COMPANY DASHBOARD
 * ===============================
 */

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    cleaningRevenue: 0,
    shopRevenue: 0,
    todayRevenue: 0,
    cleanerPayroll: 0,
    emergencyCost: 0,
    refunds: 0,
    netProfit: 0,
    completedCount: 0,
    availableCleaners: 0,
    busyCleaners: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ✅ ADDED — CHART STATE */
  const [chartData, setChartData] = useState([]);

  /* ===============================
     LOAD DASHBOARD STATS
  =============================== */
  useEffect(() => {
    let mounted = true;

    const loadStats = async () => {
      try {
        const data = await getDashboardStats();
        if (!mounted) return;

        setStats({
          totalRevenue: Number(data?.totalRevenue) || 0,
          cleaningRevenue: Number(data?.cleaningRevenue) || 0,
          shopRevenue: Number(data?.shopRevenue) || 0,
          todayRevenue: Number(data?.todayRevenue) || 0,
          cleanerPayroll: Number(data?.cleanerPayroll) || 0,
          emergencyCost: Number(data?.emergencyCost) || 0,
          refunds: Number(data?.refunds) || 0,
          netProfit: Number(data?.netProfit) || 0,
          completedCount: Number(data?.completedCount) || 0,
          availableCleaners: Number(data?.availableCleaners) || 0,
          busyCleaners: Number(data?.busyCleaners) || 0,
        });
      } catch (err) {
        console.error("Dashboard load error:", err);
        if (mounted) setError("Failed to load dashboard data.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadStats();
    return () => {
      mounted = false;
    };
  }, []);

  /* ✅ ADDED — FETCH REVENUE FOR CHART */
  useEffect(() => {
    const fetchRevenue = async () => {
      const snap = await getDocs(collection(db, "orders"));

      const map = {};

      snap.forEach((doc) => {
        const d = doc.data();

        if (d.jobStatus !== "completed") return;

        if (!d.createdAt) return;

        const date = new Date(d.createdAt.seconds * 1000);
        const key = date.toISOString().slice(0, 10);

       map[key] =
  (map[key] || 0) +
  (d.totalPrice || d.total || d.price || 0);
      });

     const result = [];

for (let i = 6; i >= 0; i--) {
  const d = new Date();
  d.setDate(d.getDate() - i);

  const key = d.toISOString().slice(0, 10);

  result.push({
    date: key,
    total: map[key] || 0,
  });
}

      setChartData(result);
    };

    fetchRevenue();
  }, []);

  if (loading) {
    return <p className="page-container">Loading dashboard…</p>;
  }

  if (error) {
    return (
      <div className="page-container">
        <h1 className="page-title">Dashboard</h1>
        <p style={{ color: "red" }}>{error}</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">Listro Company Dashboard</h1>

      <div className="stats-grid">
        <StatCard title="Total Revenue" value={`${stats.totalRevenue} AED`} />
        <StatCard title="Cleaning Revenue" value={`${stats.cleaningRevenue} AED`} />
        <StatCard title="Shop Revenue" value={`${stats.shopRevenue} AED`} />

        <StatCard title="Today’s Revenue" value={`${stats.todayRevenue} AED`} />
        <StatCard title="Cleaner Payroll" value={`${stats.cleanerPayroll} AED`} />
        <StatCard title="Emergency Loss" value={`${stats.emergencyCost} AED`} />
        <StatCard title="Refunds" value={`${stats.refunds} AED`} />
        <StatCard title="Net Profit" value={`${stats.netProfit} AED`} />

        <StatCard title="Completed Orders" value={stats.completedCount} />
        <StatCard title="Available Cleaners" value={stats.availableCleaners} />
        <StatCard title="Busy Cleaners" value={stats.busyCleaners} />
      </div>

      {/* ✅ ADDED — REVENUE CHART */}
      <div style={{ width: "100%", height: 300, marginTop: 40 }}>
        <h3>Last 7 Days Revenue</h3>

        <ResponsiveContainer>
          <LineChart data={chartData}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="total" stroke="#4f46e5" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ===============================
   STAT CARD
=============================== */
function StatCard({ title, value }) {
  const negative =
    typeof value === "string" && value.includes("-");

  return (
    <div className={`stat-card ${negative ? "negative" : ""}`}>
      <h3>{title}</h3>
      <p className="stat-value">{value}</p>
    </div>
  );
}