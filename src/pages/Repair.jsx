import { httpsCallable } from "firebase/functions";
import { functions } from "@/config/firebase";

export default function Repair() {
  const runRepair = async () => {
    try {
      const fn = httpsCallable(functions, "repairCleanerState");

      const res = await fn();

      alert("Repair complete: " + JSON.stringify(res.data, null, 2));

      console.log("Repair result:", res.data);

    } catch (err) {
      alert("Error: " + err.message);
      console.error(err);
    }
  };

  return (
    <div className="page">
      <h1>🛠 Repair Cleaner State</h1>

      <button
        onClick={runRepair}
        style={{
          background: "#0F172A",
          color: "white",
          padding: "12px 20px",
          borderRadius: "8px",
          fontWeight: "700",
          cursor: "pointer",
        }}
      >
        Run Repair Cleaner State
      </button>
    </div>
  );
}
