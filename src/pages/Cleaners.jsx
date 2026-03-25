import React, { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { LISTRO_ID } from "../config/constants";
import "../admin.css";

/**
 * CLEANERS — ANALYTICS & MANAGEMENT (PERMANENT FIX)
 * ✅ Real-time
 * ✅ listroId scoped
 * ✅ No orderBy (avoids Firestore silent failures)
 * ✅ Future-proof
 */

export default function Cleaners() {
  const [cleaners, setCleaners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCleaner, setEditingCleaner] = useState(null);

  /* ===============================
     LOAD CLEANERS (REAL-TIME SAFE)
  =============================== */
  useEffect(() => {
    const q = query(
      collection(db, "cleaners"),
      where("listroId", "==", LISTRO_ID)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setCleaners(list);
        setLoading(false);
      },
      (err) => {
        console.error("Load cleaners error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  /* ===============================
     MODAL CONTROLS
  =============================== */
  const openCreate = () => {
    setEditingCleaner(null);
    setShowModal(true);
  };

  const openEdit = (cleaner) => {
    setEditingCleaner(cleaner);
    setShowModal(true);
  };

  const closeModal = () => {
    setEditingCleaner(null);
    setShowModal(false);
  };

  /* ===============================
     CREATE / UPDATE CLEANER
  =============================== */
  const saveCleaner = async ({ name, phone, maxJobs }) => {
    if (!name || !phone) {
      alert("Name and phone are required");
      return;
    }

    try {
      if (editingCleaner) {
        await updateDoc(doc(db, "cleaners", editingCleaner.id), {
          name,
          phone,
          maxJobs: Number(maxJobs),
        });
      } else {
        await addDoc(collection(db, "cleaners"), {
          listroId: LISTRO_ID,

          name,
          phone,

          status: "available",
          activeOrders: 0,

          completedJobs: 0,
          totalEarnings: 0,

          maxJobs: Number(maxJobs) || 1,

          createdAt: serverTimestamp(),
        });
      }

      closeModal();
    } catch (err) {
      console.error(err);
      alert("Failed to save cleaner");
    }
  };

  /* ===============================
     DELETE CLEANER
  =============================== */
  const deleteCleaner = async (id) => {
    if (!window.confirm("Delete this cleaner?")) return;

    try {
      await deleteDoc(doc(db, "cleaners", id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete cleaner");
    }
  };

  /* ===============================
     UI
  =============================== */
  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Cleaners Analytics</h1>
        <button className="btn btn-primary" onClick={openCreate}>
          + Add Cleaner
        </button>
      </div>

      {loading ? (
        <p>Loading cleaners…</p>
      ) : cleaners.length === 0 ? (
        <p>No cleaners found.</p>
      ) : (
        <div className="orders-box">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Active</th>
                <th>Completed</th>
                <th>Total Earnings</th>
                <th>Max Jobs</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {cleaners.map((c) => {
                const active = Number(c.activeOrders || 0);
                const max = Number(c.maxJobs || 1);
                const available = active < max;

                return (
                  <tr key={c.id}>
                    <td><strong>{c.name}</strong></td>
                    <td>{c.phone}</td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          color: available ? "#10B981" : "#EF4444",
                        }}
                      >
                        {available ? "AVAILABLE" : "BUSY"}
                      </span>
                    </td>
                    <td>{active}</td>
                    <td>{Number(c.completedJobs || 0)}</td>
                    <td><strong>{Number(c.totalEarnings || 0)} AED</strong></td>
                    <td>{max}</td>
                    <td className="cleaners-actions">
                      <button
                        className="btn-edit"
                        onClick={() => openEdit(c)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => deleteCleaner(c.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <CleanerModal
          initialValues={editingCleaner}
          onClose={closeModal}
          onSave={saveCleaner}
        />
      )}
    </div>
  );
}

/* ===============================
   CLEANER MODAL
=============================== */
function CleanerModal({ initialValues, onClose, onSave }) {
  const [name, setName] = useState(initialValues?.name || "");
  const [phone, setPhone] = useState(initialValues?.phone || "");
  const [maxJobs, setMaxJobs] = useState(initialValues?.maxJobs || 1);

  const submit = (e) => {
    e.preventDefault();
    onSave({ name, phone, maxJobs });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content narrow">
        <button className="modal-close" onClick={onClose}>✕</button>

        <h2 className="modal-title">
          {initialValues ? "Edit Cleaner" : "Add Cleaner"}
        </h2>

        <form onSubmit={submit} className="form-grid">
          <div className="form-group">
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="form-group">
            <label>Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          <div className="form-group">
            <label>Max Jobs</label>
            <input
              type="number"
              min="1"
              value={maxJobs}
              onChange={(e) => setMaxJobs(e.target.value)}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-edit" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
