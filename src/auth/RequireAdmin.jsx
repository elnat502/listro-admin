import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { onIdTokenChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";

/**
 * ===============================
 * REQUIRE ADMIN (TOKEN SAFE)
 * ===============================
 * ✔ Waits for ID token (critical)
 * ✔ Prevents permission-denied
 * ✔ Blocks children until verified
 * ✔ Production-safe
 */

export default function RequireAdmin({ children }) {
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let active = true;

    const unsub = onIdTokenChanged(auth, async (user) => {
      try {
        if (!active) return;

        if (!user) {
          setAllowed(false);
          setChecking(false);
          return;
        }

        // 🔐 ID token is now guaranteed to be ready
        const adminRef = doc(db, "admins", user.uid);
        const adminSnap = await getDoc(adminRef);

        if (!adminSnap.exists()) {
          setAllowed(false);
          setChecking(false);
          return;
        }

        const admin = adminSnap.data();

        const isActive = admin.active !== false;
        const isAdmin =
          admin.role === "admin" ||
          admin.role === "superadmin" ||
          admin.isAdmin === true;

        setAllowed(isActive && isAdmin);
        setChecking(false);
      } catch (err) {
        console.error("Admin check failed:", err);
        setAllowed(false);
        setChecking(false);
      }
    });

    return () => {
      active = false;
      unsub();
    };
  }, []);

  if (checking) {
    return (
      <div style={{ padding: 40 }}>
        <h3>🔐 Verifying admin access…</h3>
      </div>
    );
  }

  if (!allowed) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
