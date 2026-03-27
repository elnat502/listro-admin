import React, { useState } from "react";
import { auth } from "../config/firebase";
import { signOut } from "firebase/auth";
import "./logout.css";

export default function LogoutButton() {
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      const confirmLogout = window.confirm(
        "Are you sure you want to logout?"
      );
      if (!confirmLogout) return;

      setLoggingOut(true);

      await signOut(auth);

      // Redirect safely
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout Error:", error);
      alert("Logout failed. Please try again.");
      setLoggingOut(false);
    }
  };

  return (
    <button
      className="logout-btn"
      onClick={handleLogout}
      disabled={loggingOut}
    >
      {loggingOut ? "Logging out..." : "Logout"}
    </button>
  );
}