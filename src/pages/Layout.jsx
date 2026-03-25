import Sidebar from "../components/Sidebar";
import { Outlet } from "react-router-dom";
import "./layout.css";

export default function Layout() {
  return (
    <div className="admin-shell">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <Sidebar />
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
