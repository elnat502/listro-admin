// src/components/Sidebar.jsx
import { NavLink, useNavigate } from "react-router-dom";
import {
  MdDashboard,
  MdPendingActions,
  MdListAlt,
  MdPeople,
  MdLogout,
  MdCheckCircle,
  MdAttachMoney,
  MdLocalShipping,
  MdInventory,
  MdGavel,
  MdAccountBalance,
  MdReceiptLong,
  MdPercent,
  MdPayments,
  MdBuild,
  MdShoppingCart, // ✅ ADDED ICON
} from "react-icons/md";
import "./sidebar.css";

export default function Sidebar() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("admin");
    navigate("/login", { replace: true });
  };

  const linkClass = ({ isActive }) =>
    `nav-link ${isActive ? "active" : ""}`;

  return (
    <aside className="sidebar">
      <h2 className="sidebar-title">LISTRO ADMIN</h2>

      {/* CORE */}
      <NavLink to="/dashboard" className={linkClass}>
        <MdDashboard /> Dashboard
      </NavLink>

      <NavLink to="/orders" className={linkClass}>
        <MdListAlt /> Orders
      </NavLink>

      {/* 🛍 SHOP ORDERS (ADDED) */}
      <NavLink to="/shop-orders" className={linkClass}>
        <MdShoppingCart /> Shop Orders
      </NavLink>

      <NavLink to="/pending" className={linkClass}>
        <MdPendingActions /> Pending
      </NavLink>

      <NavLink to="/completed" className={linkClass}>
        <MdCheckCircle /> Completed
      </NavLink>

      <NavLink to="/cleaners" className={linkClass}>
        <MdPeople /> Cleaners
      </NavLink>

      {/* WAREHOUSE */}
      <NavLink to="/pickup-queue" className={linkClass}>
        <MdInventory /> Pickup Queue
      </NavLink>

      <NavLink to="/returns" className={linkClass}>
        <MdLocalShipping /> Return Queue
      </NavLink>

      {/* FINANCE */}
      <NavLink to="/payroll" className={linkClass}>
        <MdAttachMoney /> Payroll
      </NavLink>

      <NavLink to="/settlement" className={linkClass}>
        <MdAccountBalance /> Settlement
      </NavLink>

      {/* ✅ NEW — SETTLEMENT HISTORY */}
      <NavLink to="/settlement-history" className={linkClass}>
        <MdReceiptLong /> Settlement History
      </NavLink>

      <NavLink to="/withdrawals" className={linkClass}>
        <MdPayments /> Withdrawals
      </NavLink>

      <NavLink to="/ledger" className={linkClass}>
        <MdReceiptLong /> Ledger
      </NavLink>

      <NavLink to="/vat" className={linkClass}>
        <MdPercent /> VAT
      </NavLink>

      {/* 🛠 REPAIR TOOLS */}
      <NavLink to="/repair-tools" className={linkClass}>
        <MdBuild /> Repair Tools
      </NavLink>

      {/* HR */}
      <NavLink to="/discipline" className={linkClass}>
        <MdGavel /> Discipline
      </NavLink>

      <button className="logout-btn" onClick={logout}>
        <MdLogout /> Logout
      </button>
    </aside>
  );
}