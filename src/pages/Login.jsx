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

      // 1️⃣ Firebase Authentication
      const res = await signInWithEmailAndPassword(auth, email, password);
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
      const isAdmin = admin.role === "admin" || admin.role === "superadmin";
      const isActive = admin.active !== false;

      if (!isAdmin || !isActive) {
        alert("❌ Admin account disabled or not authorized");
        await auth.signOut();
        return;
      }

      // 5️⃣ Success → let RequireAdmin handle protection
      navigate("/", { replace: true });
    } catch (err) {
      console.error(err);
      alert("Login failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <h2>Admin Login</h2>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={handleLogin} disabled={loading}>
        {loading ? "Logging in..." : "Login"}
      </button>
    </div>
  );
}
