import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Layout from "./pages/Layout";

import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import Pending from "./pages/Pending";
import Completed from "./pages/Completed";
import Cleaners from "./pages/Cleaners";

/* 🛍 SHOP ORDERS (NEW) */
import ShopOrders from "./pages/ShopOrders";

import CleanerPerformance from "./pages/CleanerPerformance";
import Payroll from "./pages/Payroll";
import Profit from "./pages/Profit";
import VAT from "./pages/VAT";
import Reconciliation from "./pages/Reconciliation";
import CleanerDiscipline from "./pages/CleanerDiscipline";

import PickupQueue from "./pages/PickupQueue";
import ReturnQueue from "./pages/ReturnQueue";

import Settlement from "./pages/Settlement";
import SettlementHistory from "./pages/SettlementHistory";
import Ledger from "./pages/Ledger";

import Withdrawals from "./pages/Withdrawals";
import RepairTools from "./pages/RepairTools";

import RequireAdmin from "./auth/RequireAdmin";

/**
 * ===============================
 * LISTRO ADMIN ROUTER (PRODUCTION)
 * ===============================
 */

function App() {
  return (
    <Routes>
      {/* ===============================
          PUBLIC
      =============================== */}
      <Route path="/login" element={<Login />} />

      {/* ===============================
          PROTECTED ADMIN
      =============================== */}
      <Route
        path="/"
        element={
          <RequireAdmin>
            <Layout />
          </RequireAdmin>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />

        {/* 🧠 CORE OPERATIONS */}
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="orders" element={<Orders />} />
        <Route path="pending" element={<Pending />} />
        <Route path="completed" element={<Completed />} />
        <Route path="cleaners" element={<Cleaners />} />

        {/* 🛍 SHOP ORDERS (COD / PRODUCTS) */}
        <Route path="shop-orders" element={<ShopOrders />} />

        {/* 📦 WAREHOUSE & LOGISTICS */}
        <Route path="pickup-queue" element={<PickupQueue />} />
        <Route path="returns" element={<ReturnQueue />} />

        {/* 📊 BUSINESS & FINANCE */}
        <Route path="cleaner-performance" element={<CleanerPerformance />} />
        <Route path="payroll" element={<Payroll />} />
        <Route path="profit" element={<Profit />} />
        <Route path="vat" element={<VAT />} />
        <Route path="reconciliation" element={<Reconciliation />} />
        <Route path="settlement" element={<Settlement />} />
        <Route path="settlement-history" element={<SettlementHistory />} />
        <Route path="withdrawals" element={<Withdrawals />} />
        <Route path="ledger" element={<Ledger />} />

        {/* 🛠 SYSTEM TOOLS */}
        <Route path="repair-tools" element={<RepairTools />} />

        {/* 🚨 HR & DISCIPLINE */}
        <Route path="discipline" element={<CleanerDiscipline />} />
      </Route>

      {/* ===============================
          FALLBACK
      =============================== */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
