import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  setDoc,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../config/firebase";
import "../admin.css";

const statusLabel = (status) => {
  const map = {
    pending: "🟡 Pending",
    pending_admin: "🟡 Pending",
    accepted: "🔵 Accepted",
    assigned: "🟠 Assigned",
    out_for_delivery: "🟣 Out for delivery",
    delivered: "🟢 Delivered", // ✅ ADDED
    cancel_requested: "🔴 Cancel requested",
    cancelled: "⚫ Cancelled",
    completed: "🟢 Completed",
  };
  return map[status] || status;
};

/* ✅ SAFE TOTAL */
const getShopOrderTotal = (order) =>
  Number(
    order?.totalAmount ??
      order?.totalPrice ??
      order?.total ??
      order?.price ??
      order?.subtotal ??
      0
  );

export default function ShopOrders() {
  const [orders, setOrders] = useState([]);
  const [cleaners, setCleaners] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "shopOrders"), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setOrders(list);
    });

    return unsub;
  }, []);

  useEffect(() => {
    const q = query(collection(db, "cleaners"), orderBy("name", "asc"));

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setCleaners(list);
    });

    return unsub;
  }, []);

  /* ===============================
     ADMIN ACTIONS
  =============================== */

  const acceptOrder = async (order) => {
    if (order.orderStatus !== "pending" && order.orderStatus !== "pending_admin") return; // ✅ SAFETY
    await updateDoc(doc(db, "shopOrders", order.id), {
      orderStatus: "accepted",
      acceptedAt: serverTimestamp(),
    });
  };

  const rejectOrder = async (order) => {
    const reason = prompt("Reason for cancelling this order (optional)");

    await updateDoc(doc(db, "shopOrders", order.id), {
      orderStatus: "cancelled",
      cancelledAt: serverTimestamp(),
      cancelledBy: "admin",
      cancelReason: reason || "Cancelled by admin",
    });
  };

  const assignDelivery = async (order) => {
    if (order.orderStatus !== "accepted") return; // ✅ SAFETY

    if (!cleaners.length) {
      alert("No cleaners available to assign.");
      return;
    }

    const cleanerOptions = cleaners
      .map(
        (c, i) =>
          `${i + 1}. ${c.name || "Unnamed"}${
            c.phone ? ` - ${c.phone}` : ""
          }${c.availability ? ` (${c.availability})` : ""}`
      )
      .join("\n");

    const selected = prompt(`Select cleaner by number:\n\n${cleanerOptions}`);
    const selectedIndex = Number(selected) - 1;

    if (
      Number.isNaN(selectedIndex) ||
      selectedIndex < 0 ||
      selectedIndex >= cleaners.length
    ) {
      return;
    }

    const chosenCleaner = cleaners[selectedIndex];
    const deliveryEta = prompt("ETA (e.g. Today 6–8 PM)");

    await updateDoc(doc(db, "shopOrders", order.id), {
      orderStatus: "assigned",
      assignedCleanerId: chosenCleaner.id,
      assignedCleanerName: chosenCleaner.name || "Unknown",
      assignedCleanerPhone: chosenCleaner.phone || "",
      deliveryEta: deliveryEta || "",
      deliveryAssignedAt: serverTimestamp(),
    });
  };

  const startDelivery = async (order) => {
    if (order.orderStatus !== "assigned") return; // ✅ SAFETY

    await updateDoc(doc(db, "shopOrders", order.id), {
      orderStatus: "out_for_delivery",
      outForDeliveryAt: serverTimestamp(),
    });
  };

  const markDelivered = async (order) => {
  try {
    console.log("🚀 markDelivered called", order.id);
    const orderRef = doc(db, "shopOrders", order.id);
    const ledgerRef = doc(db, "companyLedger", `shop_${order.id}`);

    const total =
      getShopOrderTotal?.(order) ||
      Number(
        order?.totalAmount ??
        order?.totalPrice ??
        order?.total ??
        order?.price ??
        ((Number(order?.subtotal || 0)) + (Number(order?.deliveryFee || 0)))
      ) ||
      0;

    await updateDoc(orderRef, {
      orderStatus: "completed",
      deliveredAt: serverTimestamp(),
      confirmedByAdmin: true,
      paymentStatus: "paid",
      lastUpdatedAt: serverTimestamp(),
    });

    await setDoc(
      ledgerRef,
      {
        orderId: order.id,
        cleanerId: order.assignedCleanerId || null,
        cleanerName: order.assignedCleanerName || "Unknown",
        amount: total,
        type: "shop_order_cod",
        flow: "IN",
        source: "shop",
        status: "settled",
        paymentMethod: order.paymentMethod || "cod",
        createdAt: serverTimestamp(),
        serviceMode: "shop_delivery",
      },
      { merge: true }
    );

    if (order.assignedCleanerId) {
      await updateDoc(doc(db, "cleaners", order.assignedCleanerId), {
        activeOrders: 0,
        activeOrderId: null,
        inProgressOrderId: null,
        status: "idle",
        availability: "online",
        lastReleasedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    console.error("❌ Mark Delivered ERROR:", err);
  }
};

  const approveCancel = async (order) => {
    await updateDoc(doc(db, "shopOrders", order.id), {
      orderStatus: "cancelled",
      cancelledAt: serverTimestamp(),
      cancelledBy: "admin",
    });
  };

  const denyCancel = async (order) => {
    await updateDoc(doc(db, "shopOrders", order.id), {
      orderStatus: "accepted",
      cancelDecisionAt: serverTimestamp(),
    });
  };

  return (
    <div className="page-container">
      <h1 className="page-title">🛍 Shop Orders</h1>

      {orders.length === 0 && <p>No shop orders yet</p>}

      {orders.map((o) => {
        const total = getShopOrderTotal(o);

        return (
          <div
            key={o.id}
            className="order-card"
            style={{
              border:
                o.orderStatus === "cancel_requested"
                  ? "2px solid #ef4444"
                  : "1px solid #ddd",
            }}
          >
            <h3>Order #{o.id.slice(0, 6)}</h3>

            <p>
              <b>Status:</b> {statusLabel(o.orderStatus)}
            </p>
            <p>
              <b>Total:</b> {total} AED
            </p>
            <p>
              <b>Payment:</b> {o.paymentMethod}
            </p>

            <p>
              <b>Customer:</b> {o.deliveryAddress?.fullName} <br />
              <b>Phone:</b> {o.deliveryAddress?.phone} <br />
              <b>Address:</b> {o.deliveryAddress?.addressLine}
            </p>

            {o.assignedCleanerName && (
              <p>
                <b>Assigned Cleaner:</b> {o.assignedCleanerName}
                {o.assignedCleanerPhone ? ` (${o.assignedCleanerPhone})` : ""}
                <br />
                {o.deliveryEta ? (
                  <>
                    <b>ETA:</b> {o.deliveryEta}
                  </>
                ) : null}
              </p>
            )}

            {(o.orderStatus === "pending" ||
              o.orderStatus === "pending_admin") && (
              <>
                <button onClick={() => acceptOrder(o)}>Accept Order</button>
                <button
                  style={{ background: "#dc2626", color: "#fff", marginLeft: 8 }}
                  onClick={() => rejectOrder(o)}
                >
                  Reject Order
                </button>
              </>
            )}

            {o.orderStatus === "accepted" && (
              <button onClick={() => assignDelivery(o)}>Assign Cleaner</button>
            )}

            {o.orderStatus === "assigned" && (
              <button onClick={() => startDelivery(o)}>Start Delivery</button>
            )}

            {o.orderStatus === "out_for_delivery" && (
  <button onClick={() => markDelivered(o)}>Mark Delivered</button>
)}

            {o.orderStatus === "cancel_requested" && (
              <>
                <button
                  style={{ background: "#dc2626", color: "#fff" }}
                  onClick={() => approveCancel(o)}
                >
                  Approve Cancellation
                </button>
                <button
                  style={{ background: "#16a34a", color: "#fff" }}
                  onClick={() => denyCancel(o)}
                >
                  Deny Cancellation
                </button>
              </>
            )}

           {o.orderStatus === "completed" && ( // ✅ CORRECT
              <span style={{ color: "green", fontWeight: "bold" }}>
                ✔ Delivered
              </span>
            )}

            {o.orderStatus === "cancelled" && (
              <span style={{ color: "#6b7280", fontWeight: "bold" }}>
                ✖ Cancelled
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}