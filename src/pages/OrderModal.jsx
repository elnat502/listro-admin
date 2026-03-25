// src/pages/OrderModal.jsx
export default function OrderModal({ order, user, onClose }) {
  if (!order) return null;

  const modalBg = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0,0,0,0.35)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  };

  const modalBox = {
    width: "420px",
    background: "white",
    borderRadius: "12px",
    padding: "25px",
    boxShadow: "0 8px 25px rgba(0,0,0,0.2)",
    fontFamily: "Arial",
  };

  const title = {
    fontSize: "22px",
    fontWeight: "700",
    marginBottom: "16px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  };

  const row = {
    marginBottom: "12px",
  };

  const label = {
    fontWeight: "600",
  };

  const buttonClose = {
    marginTop: "18px",
    width: "100%",
    padding: "12px",
    background: "black",
    border: "none",
    borderRadius: "7px",
    color: "white",
    cursor: "pointer",
    fontSize: "15px",
  };

  return (
    <div style={modalBg} onClick={onClose}>
      <div style={modalBox} onClick={(e) => e.stopPropagation()}>
        <div style={title}>📦 Order Details</div>

        <div style={row}>
          <span style={label}>Service: </span>
          {order.serviceType}
        </div>

        <div style={row}>
          <span style={label}>Shoe: </span>
          {order.shoeType}
        </div>

        <div style={row}>
          <span style={label}>Customer: </span>
          {user?.name || "Unknown"}
        </div>

        <div style={row}>
          <span style={label}>Phone: </span>
          {user?.phone || "-"}
        </div>

        <div style={row}>
          <span style={label}>Address: </span>
          {user?.address || "-"}
        </div>

        <div style={row}>
          <span style={label}>Earning: </span>
          AED {order.earning || 0}
        </div>

        <button style={buttonClose} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
