import React from "react";
import { auth } from "../config/firebase";
import { signOut } from "firebase/auth";
import "./logout.css";

export default function LogoutButton() {
  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  return (
    <button className="logout-btn" onClick={handleLogout}>
      Logout
    </button>
  );
}
