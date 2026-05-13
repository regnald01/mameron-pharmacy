import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, CSSProperties, FormEvent } from "react";

import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  createMedicineItem,
  deleteMedicineItem,
  fetchMedicineItems,
  updateMedicineItem,
} from "../lib/api";
import type { MedicineItemRecord } from "../lib/api";

const ITEMS_PER_PAGE = 8;

const emptyForm = {
  name: "",
};

function ItemsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const actor = user?.name ?? user?.email ?? "System";
  const [items, setItems] = useState<MedicineItemRecord[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const loadItems = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setLoading(true);
      }

      try {
        const data = await fetchMedicineItems();
        setItems(data);
        setError(null);
      } catch {
        setError("Unable to load items right now.");
        showToast("Unable to load items right now.", "error");
      } finally {
        setLoading(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    let active = true;

    const syncItems = async () => {
      if (!active) {
        return;
      }

      await loadItems();
    };

    void syncItems();

    return () => {
      active = false;
    };
  }, [loadItems]);

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return items;
    }

    return items.filter((item) => item.name.toLowerCase().includes(query));
  }, [items, search]);

  const totalPages = Math.max(1, Math.ceil(visibleItems.length / ITEMS_PER_PAGE));

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return visibleItems.slice(start, start + ITEMS_PER_PAGE);
  }, [currentPage, visibleItems]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setForm({ name: event.target.value });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      if (editingId !== null) {
        await updateMedicineItem(editingId, form, actor);
        showToast("Item updated successfully.", "success");
      } else {
        await createMedicineItem(form, actor);
        showToast("Item added successfully.", "success");
      }

      await loadItems({ silent: true });
      setForm(emptyForm);
      setEditingId(null);
    } catch {
      showToast("Unable to save item right now.", "error");
    }
  };

  const handleEdit = (item: MedicineItemRecord) => {
    setForm({ name: item.name });
    setEditingId(item.id);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMedicineItem(id, actor);
      await loadItems({ silent: true });

      if (editingId === id) {
        setEditingId(null);
        setForm(emptyForm);
      }

      showToast("Item deleted successfully.", "info");
    } catch {
      showToast("Unable to delete item right now.", "error");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  if (loading) {
    return <section className="panel panel--wide">Loading items...</section>;
  }

  if (error) {
    return <section className="panel panel--wide">{error}</section>;
  }

  return (
    <section className="panel panel--wide">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Item Registry</p>
          <h2>Medicine item names</h2>
        </div>
        <span className="badge badge--healthy">{items.length} items</span>
      </div>

      <form onSubmit={handleSubmit} style={formStyle}>
        <input
          name="name"
          placeholder="Medicine item name"
          value={form.name}
          onChange={handleChange}
          required
        />
        <div className="row-actions">
          <button type="submit" className="button button--primary">
            {editingId !== null ? "Update item" : "Add item"}
          </button>
          {editingId !== null ? (
            <button
              type="button"
              className="button button--ghost"
              onClick={handleCancelEdit}
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <div className="toolbar" style={toolbarStyle}>
        <input
          type="search"
          placeholder="Search medicine item name"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Medicine item name</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={2}>
                  {search ? "No matching items found." : "No item names added yet."}
                </td>
              </tr>
            ) : (
              paginatedItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="button button--ghost"
                        onClick={() => handleEdit(item)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="button button--ghost"
                        onClick={() => void handleDelete(item.id)}
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

      {visibleItems.length > 0 ? (
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

const formStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(220px, 1fr) auto",
  gap: "12px",
  margin: "20px 0 24px",
  alignItems: "center",
};

const toolbarStyle: CSSProperties = {
  marginBottom: "20px",
};

export default ItemsPage;
