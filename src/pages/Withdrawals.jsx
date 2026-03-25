import { useEffect, useState } from "react";
import { subscribeWithdrawals } from "@/services/getWithdrawalRequests";
import { processWithdrawal } from "@/services/processWithdrawal";

export default function Withdrawals() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  // 🔴 Reject modal state
  const [showReject, setShowReject] = useState(false);
  const [rejectId, setRejectId] = useState(null);
  const [adminNote, setAdminNote] = useState("");

  useEffect(() => {
    const unsub = subscribeWithdrawals((rows) => {
      setList(rows);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  /* ===============================
     APPROVE WITHDRAWAL (UNCHANGED)
  =============================== */
  const handleApprove = async (id) => {
    try {
      setProcessingId(id);

      await processWithdrawal({
        requestId: id,
        action: "approve",
      });

      alert("Withdrawal approved successfully");
    } catch (err) {
      console.error("Withdrawal Error:", err);
      alert("Error processing withdrawal: " + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  /* ===============================
     CONFIRM REJECT (ADMIN)
  =============================== */
  const confirmReject = async () => {
    try {
      setProcessingId(rejectId);

      await processWithdrawal({
        requestId: rejectId,
        action: "reject",
        note: adminNote?.trim() || null, // future-safe
      });

      alert("Withdrawal rejected successfully");
      setShowReject(false);
      setAdminNote("");
      setRejectId(null);
    } catch (err) {
      console.error("Withdrawal Reject Error:", err);
      alert("Error rejecting withdrawal: " + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <h2>Loading withdrawals…</h2>;
  if (list.length === 0) return <h3>No withdrawal requests</h3>;

  return (
    <div className="page">
      <h1>💰 Withdrawal Requests</h1>

      <table className="table">
        <thead>
          <tr>
            <th>Cleaner</th>
            <th>Amount</th>
            <th>Requested</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {list.map((w) => (
            <tr key={w.id}>
              <td>{w.cleanerName || "—"}</td>
              <td>{w.amount} AED</td>
              <td>
                {w.createdAt?.seconds
                  ? new Date(w.createdAt.seconds * 1000).toLocaleString()
                  : "—"}
              </td>
              <td>{w.status}</td>

              <td>
                {w.status === "pending" ? (
                  <div style={{ display: "flex", gap: 10 }}>
                    {/* APPROVE */}
                    <button
                      onClick={() => handleApprove(w.id)}
                      disabled={processingId === w.id}
                      className="btn"
                      style={{ background: "#16a34a", color: "white" }}
                    >
                      {processingId === w.id ? "Processing…" : "Pay"}
                    </button>

                    {/* REJECT */}
                    <button
                      onClick={() => {
                        setRejectId(w.id);
                        setShowReject(true);
                      }}
                      disabled={processingId === w.id}
                      className="btn"
                      style={{ background: "#dc2626", color: "white" }}
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <span
                    style={{
                      fontWeight: "bold",
                      color:
                        w.status === "approved"
                          ? "#16a34a"
                          : "#dc2626",
                    }}
                  >
                    {w.status === "approved"
                      ? "✓ Approved"
                      : "✕ Rejected"}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ===============================
          REJECT CONFIRMATION MODAL
      =============================== */}
      {showReject && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 420 }}>
            <h3 style={{ color: "#dc2626" }}>Reject Withdrawal</h3>

            <p style={{ fontSize: 14 }}>
              This action is <strong>final</strong>. The cleaner will not
              receive this payout.
            </p>

            <textarea
              placeholder="Optional admin note (audit log)"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={3}
              style={{ width: "100%", marginTop: 10 }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 16,
              }}
            >
              <button
                className="btn btn-ghost"
                onClick={() => setShowReject(false)}
              >
                Cancel
              </button>

              <button
                className="btn btn-danger"
                onClick={confirmReject}
                disabled={processingId === rejectId}
              >
                {processingId === rejectId
                  ? "Rejecting…"
                  : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
