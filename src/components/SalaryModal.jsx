import React, { useState } from "react";
import { applyPenalty } from "../services/applyPenalty";
import { addBonus } from "../services/addBonus";
import "../admin.css";

/**
 * ===============================
 * SALARY MODAL
 * Used by Payroll page
 * ===============================
 */

export default function SalaryModal({ cleaner, type, onClose }) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const month = new Date().toISOString().slice(0, 7); // 2025-12

  const submit = async () => {
    if (!amount || Number(amount) <= 0) {
      alert("Enter valid amount");
      return;
    }

    try {
      setLoading(true);

      if (type === "penalty") {
        await applyPenalty(
          cleaner.id,
          month,
          "admin",
          Number(amount),
          reason || "Admin penalty"
        );
      } else {
        await addBonus(
          cleaner.id,
          month,
          Number(amount),
          reason || "Admin bonus"
        );
      }

      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 420 }}>
        <h2>
          {type === "penalty" ? "➖ Apply Penalty" : "➕ Add Bonus"} — {cleaner.name}
        </h2>

        <input
          type="number"
          placeholder="Amount (AED)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <input
          placeholder="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button className="btn btn-success" onClick={submit} disabled={loading}>
            {loading ? "Saving..." : "Confirm"}
          </button>

          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
