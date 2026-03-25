import { db } from "../config/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  Timestamp,
} from "firebase/firestore";
import { LISTRO_ID } from "../config/constants";

export async function getDashboardStats() {
  const now = new Date();

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  startOfMonth.setHours(0, 0, 0, 0);

  let fixedCosts = 0;

  try {
    const financeSnap = await getDoc(doc(db, "config", "finance"));

    if (financeSnap.exists()) {
      const f = financeSnap.data();
      if (!f.listroId || f.listroId === LISTRO_ID) {
        fixedCosts =
          Number(f.monthlyFuelBudget || 0) +
          Number(f.monthlyMarketingBudget || 0) +
          Number(f.monthlyToolsBudget || 0);
      }
    }
  } catch {
    fixedCosts = 0;
  }

  /* ===============================
     🔐 CLEANING LEDGER
  =============================== */
  const ledgerRef = collection(db, "ledger");
  const ledgerQuery = query(
    ledgerRef,
    where("type", "==", "earning"),
    where("flow", "==", "IN"),
    where("createdAt", ">=", Timestamp.fromDate(startOfMonth))
  );

  const ledgerSnap = await getDocs(ledgerQuery);

  /* ===============================
     🛍 SHOP LEDGER
  =============================== */
  const shopLedgerRef = collection(db, "companyLedger");
  const shopLedgerSnap = await getDocs(shopLedgerRef);

  const ordersRef = collection(db, "orders");
  const ordersQuery = query(ordersRef, where("listroId", "==", LISTRO_ID));
  const ordersSnap = await getDocs(ordersQuery);

  const cleanersRef = collection(db, "cleaners");
  const cleanersQuery = query(cleanersRef, where("listroId", "==", LISTRO_ID));
  const cleanersSnap = await getDocs(cleanersQuery);

  let monthRevenue = 0;
  let todayRevenue = 0;

  let cleaningRevenue = 0;
  let shopRevenue = 0;

  /* ===============================
     CLEANING REVENUE
  =============================== */
  ledgerSnap.forEach((d) => {
    const l = d.data();
    const amount = Number(l.amount || 0);

    monthRevenue += amount;

    if (l.type === "earning") {
      cleaningRevenue += amount;
    }

    // ✅ FIX: TODAY REVENUE FROM CLEANING LEDGER
    if (l.completedAt instanceof Timestamp) {
      const dt = l.completedAt.toDate();
      if (dt >= startOfToday) {
        todayRevenue += amount;
      }
    }
  });

  /* ===============================
     🛍 SHOP REVENUE
  =============================== */
  shopLedgerSnap.forEach((d) => {
    const l = d.data();

    if (l.type === "shop_order_cod" || l.type === "cod") {
      const amount = Number(l.amount || 0);

      monthRevenue += amount;
      shopRevenue += amount;

     if (
  l.completedAt instanceof Timestamp &&
  (l.type === "shop_order_cod" || l.type === "cod")
) {
  const dt = l.completedAt.toDate();

  if (dt >= startOfToday && dt <= new Date()) {
    todayRevenue += amount;
  }
}
    }
  });

  /* ===============================
     FALLBACK (ONLY IF NO CLEANING LEDGER)
  =============================== */
  ordersSnap.forEach((d) => {
    const o = d.data();

    if (
      o.jobStatus === "completed" ||
      o.orderStatus === "completed"
    ) {
      const value =
        Number(o.totalPrice) ||
        Number(o.finalPrice) ||
        Number(o.total) ||
        Number(o.price) ||
        Number(o.earning) ||
        (Number(o.subtotal || 0) + Number(o.deliveryFee || 0)) ||
        0;

      if (!o.orderType || o.orderType !== "shop") {
        cleaningRevenue += value;
        monthRevenue += value;
      }

      // ✅ FIXED BLOCK (THIS WAS BROKEN)
     if (
  o.completedAt instanceof Timestamp &&
  (o.jobStatus === "completed" || o.orderStatus === "completed")
) {
  const dt = o.completedAt.toDate();

  if (dt >= startOfToday && dt <= new Date()) {
    todayRevenue += value;
  }
}
    }
  });

  /* ===============================
     ORDERS
  =============================== */
  let completedCount = 0;
  let refunds = 0;
  let emergencyCost = 0;

  ordersSnap.forEach((d) => {
    const o = d.data();

    refunds += Number(o.refundAmount || 0);

    if (o.jobStatus === "emergency_closed") {
      emergencyCost += Number(o.earning || 0);
    }

    if (o.jobStatus === "completed") {
      completedCount += 1;
    }
  });

  /* ===============================
     CLEANERS
  =============================== */
  let availableCleaners = 0;
  let busyCleaners = 0;
  let cleanerPayroll = 0;

  cleanersSnap.forEach((d) => {
    const c = d.data();

    if (c.status === "idle" && c.availability === "online") {
      availableCleaners++;
    } else if (c.status === "busy") {
      busyCleaners++;
    }

    cleanerPayroll += Number(c.monthlySalary || 0);
  });

  /* ===============================
     NET PROFIT
  =============================== */
  const netProfit =
    monthRevenue -
    cleanerPayroll -
    emergencyCost -
    refunds -
    fixedCosts;

  return {
    totalRevenue: monthRevenue,
    cleaningRevenue,
    shopRevenue,
    todayRevenue,
    cleanerPayroll,
    emergencyCost,
    refunds,
    fixedCosts,
    netProfit,
    completedCount,
    availableCleaners,
    busyCleaners,
  };
}