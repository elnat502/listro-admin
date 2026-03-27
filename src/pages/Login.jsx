import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../config/firebase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      setLoading(true);

      const cleanEmail = email.trim();

      if (!cleanEmail || !password) {
        alert("Please enter your email and password.");
        return;
      }

      // 1️⃣ Firebase Authentication
      const res = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const user = res.user;
      const uid = user.uid;

      // 2️⃣ Force refresh token to load latest claims (admin=true)
      await user.getIdToken(true);

      // 3️⃣ Load Firestore admin record
      const adminRef = doc(db, "admins", uid);
      const snap = await getDoc(adminRef);

      if (!snap.exists()) {
        alert("❌ Not registered as admin");
        await auth.signOut();
        return;
      }

      const admin = snap.data();

      // 4️⃣ Allow BOTH admin & superadmin
      const isAdmin =
        admin.role === "admin" ||
        admin.role === "superadmin" ||
        admin.isAdmin === true;

      const isActive = admin.active !== false;

      if (!isAdmin || !isActive) {
        alert("❌ Admin account disabled or not authorized");
        await auth.signOut();
        return;
      }

      // 5️⃣ Success → let RequireAdmin handle protection
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Login failed:", err);

      let message = "Login failed. Please try again.";

      if (
        err?.code === "auth/invalid-credential" ||
        err?.code === "auth/wrong-password" ||
        err?.code === "auth/user-not-found" ||
        err?.code === "auth/invalid-email"
      ) {
        message = "Invalid email or password.";
      } else if (err?.code === "auth/too-many-requests") {
        message = "Too many failed attempts. Please try again later.";
      } else if (err?.code === "auth/network-request-failed") {
        message = "Network error. Please check your internet connection.";
      }

      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !loading) {
      handleLogin();
    }
  };

  return (
    <div className="login-page">
      <h2>Admin Login</h2>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={handleKeyDown}
        autoComplete="email"
      />

      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={handleKeyDown}
        autoComplete="current-password"
      />

      <button onClick={handleLogin} disabled={loading}>
        {loading ? "Logging in..." : "Login"}
      </button>
    </div>
  );
}