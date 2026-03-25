import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../config/firebase";

/**
 * ===============================
 * 🛠 ADMIN REPAIR TOOLS (WEB)
 * ===============================
 * - Manual execution only
 * - Admin protected by route guard
 * - Production safe
 */

export default function RepairTools() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  /* ===============================
     🔧 REPAIR CLEANER STATE
     - Fixes stuck cleaners
     - activeOrders
     - availability
     - inProgressOrderId
  =============================== */
  const repairCleanerState = async () => {
    try {
      setLoading(true);
      setMessage("");

      const fn = httpsCallable(functions, "repairCleanerState");
      const res = await fn();

      setMessage(
        res.data?.message || "Cleaner state repaired successfully ✅"
      );
    } catch (err) {
      console.error("Repair error:", err);
      setMessage(
        err.message || "❌ Failed to repair cleaner state"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🛠 Admin Repair Tools</h1>

      <button
        style={{
          ...styles.button,
          opacity: loading ? 0.6 : 1,
          cursor: loading ? "not-allowed" : "pointer",
        }}
        onClick={repairCleanerState}
        disabled={loading}
      >
        {loading ? "Repairing..." : "🔄 Repair Cleaner State"}
      </button>

      {message && <p style={styles.message}>{message}</p>}

      <p style={styles.note}>
        ⚠ Use only when a cleaner is stuck <br />
        (e.g. <b>busy</b> but no active order).
      </p>
    </div>
  );
}

/* ===============================
   SIMPLE STYLES (NO CSS FILE)
=============================== */

const styles = {
  container: {
    padding: "40px",
    maxWidth: "600px",
  },
  title: {
    marginBottom: "24px",
  },
  button: {
    backgroundColor: "#0F172A",
    color: "#fff",
    padding: "14px 20px",
    borderRadius: "10px",
    border: "none",
    fontSize: "15px",
    fontWeight: "700",
  },
  message: {
    marginTop: "16px",
    fontSize: "14px",
  },
  note: {
    marginTop: "20px",
    color: "#6B7280",
    fontSize: "13px",
  },
};
