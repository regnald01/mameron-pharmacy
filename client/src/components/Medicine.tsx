import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, CSSProperties, FormEvent } from "react";

import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  createMedicine,
  deleteMedicine,
  fetchMedicines,
  updateMedicine,
} from "../lib/api";
import type { MedicineRecord } from "../lib/api";

type MedicineForm = Omit<MedicineRecord, "id">;
const MEDICINES_PER_PAGE = 6;

const emptyForm: MedicineForm = {
  name: "",
  purchasePrice: "",
  sellingPrice: "",
  quantity: "",
  expiryDate: "",
};

function Medicines() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const actor = user?.name ?? user?.email ?? "System";
  const [medicines, setMedicines] = useState<MedicineRecord[]>([]);
  const [form, setForm] = useState<MedicineForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExpiredOnly, setShowExpiredOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const loadMedicines = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setLoading(true);
      }

      try {
        const data = await fetchMedicines();
        setMedicines(data);
        setError(null);
      } catch {
        setError("Unable to load medicines right now.");
        showToast("Unable to load medicines right now.", "error");
      } finally {
        setLoading(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    let active = true;

    const syncMedicines = async () => {
      if (!active) {
        return;
      }

      await loadMedicines();
    };

    void syncMedicines();

    return () => {
      active = false;
    };
  }, [loadMedicines]);

  const expiredCount = useMemo(
    () => medicines.filter((medicine) => isExpired(medicine.expiryDate)).length,
    [medicines]
  );

  const visibleMedicines = useMemo(() => {
    if (!showExpiredOnly) {
      return medicines;
    }

    return medicines.filter((medicine) => isExpired(medicine.expiryDate));
  }, [medicines, showExpiredOnly]);

  const totalPages = Math.max(
    1,
    Math.ceil(visibleMedicines.length / MEDICINES_PER_PAGE)
  );

  const paginatedMedicines = useMemo(() => {
    const start = (currentPage - 1) * MEDICINES_PER_PAGE;
    return visibleMedicines.slice(start, start + MEDICINES_PER_PAGE);
  }, [currentPage, visibleMedicines]);

  useEffect(() => {
    setCurrentPage(1);
  }, [showExpiredOnly]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      if (editingId !== null) {
        await updateMedicine(editingId, form, actor);
        await loadMedicines({ silent: true });
        setEditingId(null);
        showToast("Medicine updated successfully.", "success");
      } else {
        await createMedicine(form, actor);
        await loadMedicines({ silent: true });
        showToast("Medicine added successfully.", "success");
      }

      setForm(emptyForm);
    } catch {
      showToast("Unable to save medicine right now.", "error");
    }
  };

  const handleEdit = (medicine: MedicineRecord) => {
    setForm({
      name: medicine.name,
      purchasePrice: medicine.purchasePrice,
      sellingPrice: medicine.sellingPrice,
      quantity: medicine.quantity,
      expiryDate: medicine.expiryDate,
    });
    setEditingId(medicine.id);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMedicine(id, actor);
      await loadMedicines({ silent: true });
      showToast("Medicine deleted successfully.", "info");
    } catch {
      showToast("Unable to delete medicine right now.", "error");
    }
  };

  const toggleExpiredFilter = () => {
    setShowExpiredOnly((current) => !current);
  };

  if (loading) {
    return <section className="panel panel--wide">Loading medicines...</section>;
  }

  if (error) {
    return <section className="panel panel--wide">{error}</section>;
  }

  return (
    <section className="panel panel--wide">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Inventory Control</p>
          <h2>Medicine management</h2>
        </div>
        <button
          type="button"
          className={`button ${showExpiredOnly ? "button--primary" : "button--secondary"} notification-button`}
          onClick={toggleExpiredFilter}
        >
          Expired items
          <span className="notification-button__count">{expiredCount}</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} style={formStyle}>
        <input
          name="name"
          placeholder="Medicine name"
          value={form.name}
          onChange={handleChange}
          required
        />
        <input
          name="purchasePrice"
          type="number"
          placeholder="Purchase price"
          value={form.purchasePrice}
          onChange={handleChange}
          required
        />
        <input
          name="sellingPrice"
          type="number"
          placeholder="Selling price"
          value={form.sellingPrice}
          onChange={handleChange}
          required
        />
        <input
          name="quantity"
          type="number"
          placeholder="Stock quantity"
          value={form.quantity}
          onChange={handleChange}
          required
        />
        <input
          name="expiryDate"
          type="date"
          value={form.expiryDate}
          onChange={handleChange}
          required
        />
        <button type="submit" className="button button--primary">
          {editingId !== null ? "Update medicine" : "Add medicine"}
        </button>
      </form>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Purchase</th>
              <th>Selling</th>
              <th>Stock</th>
              <th>Expiry</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedMedicines.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  {showExpiredOnly
                    ? "No expired medicines found."
                    : "No medicines added yet."}
                </td>
              </tr>
            ) : (
              paginatedMedicines.map((medicine) => (
                <tr key={medicine.id}>
                  <td>{medicine.name}</td>
                  <td>{medicine.purchasePrice}</td>
                  <td>{medicine.sellingPrice}</td>
                  <td>{medicine.quantity}</td>
                  <td style={{ color: isExpired(medicine.expiryDate) ? "#b91c1c" : "#334155" }}>
                    {medicine.expiryDate}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="button button--ghost"
                        onClick={() => handleEdit(medicine)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="button button--ghost"
                        onClick={() => void handleDelete(medicine.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {visibleMedicines.length > 0 ? (
        <div className="pagination-actions">
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <div className="row-actions">
            <button
              type="button"
              className="button button--ghost"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function isExpired(date: string): boolean {
  return new Date(date) < new Date();
}

const formStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "12px",
  margin: "20px 0 24px",
};

export default Medicines;
