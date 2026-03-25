import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase";

export default function Customers() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snapshot) => {
      const arr = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(arr);
    });
    return () => unsub();
  }, []);

  const tableWrapper = {
    padding: "30px 40px",
  };

  return (
    <div style={tableWrapper}>
      <h1>📌 Customers</h1>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Orders</th>
            <th>Joined</th>
          </tr>
        </thead>

        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.name || "—"}</td>
              <td>{u.phone || "—"}</td>
              <td>{u.totalOrders || 0}</td>
              <td>
                {u?.createdAt
                  ? new Date(u.createdAt).toLocaleDateString("en-GB")
                  : "—"}
              </td>
            </tr>
          ))}

          {users.length === 0 && (
            <tr>
              <td colSpan={4}>No customers found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
