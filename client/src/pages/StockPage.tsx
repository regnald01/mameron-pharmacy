import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { FiFileText } from "react-icons/fi";
import { HiOutlineTableCells } from "react-icons/hi2";

import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  fetchMedicineItems,
  fetchStockRecords,
  saveStockMovement,
} from "../lib/api";
import type { MedicineItemRecord, StockRecord } from "../lib/api";

const STOCK_ITEMS_PER_PAGE = 6;

const emptyForm = {
  medicineItemId: "",
  quantity: "",
  operation: "add" as "add" | "deduct",
  expiryDate: "",
};

function StockPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const actor = user?.name ?? user?.email ?? "System";
  const [stockRecords, setStockRecords] = useState<StockRecord[]>([]);
  const [medicineItems, setMedicineItems] = useState<MedicineItemRecord[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReportOptions, setShowReportOptions] = useState(false);
  const [showExpiredOnly, setShowExpiredOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const heroActionsRef = useRef<HTMLDivElement | null>(null);

  const loadStock = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setLoading(true);
      }

      try {
        const [stocks, items] = await Promise.all([
          fetchStockRecords(),
          fetchMedicineItems(),
        ]);
        setStockRecords(stocks);
        setMedicineItems(items);
        setError(null);
      } catch {
        setError("Unable to load stock right now.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    let active = true;

    const syncStock = async () => {
      if (!active) {
        return;
      }

      await loadStock();
    };

    void syncStock();

    return () => {
      active = false;
    };
  }, [loadStock]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (heroActionsRef.current?.contains(target)) {
        return;
      }

      setShowReportOptions(false);
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  const stockStats = useMemo(() => {
    const totalItems = stockRecords.length;
    const totalUnits = stockRecords.reduce(
      (sum, record) => sum + Number(record.stockBalance),
      0
    );
    const lowStock = stockRecords.filter((record) => Number(record.stockBalance) <= 50).length;
    const expiringSoon = stockRecords.filter((record) =>
      willExpireSoon(record.expiryDate)
    ).length;

    return { totalItems, totalUnits, lowStock, expiringSoon };
  }, [stockRecords]);

  const lowStockItems = useMemo(
    () => stockRecords.filter((record) => Number(record.stockBalance) <= 50),
    [stockRecords]
  );

  const expiredCount = useMemo(
    () => stockRecords.filter((record) => isExpired(record.expiryDate)).length,
    [stockRecords]
  );

  const visibleStockRecords = useMemo(() => {
    if (!showExpiredOnly) {
      return stockRecords;
    }

    return stockRecords.filter((record) => isExpired(record.expiryDate));
  }, [stockRecords, showExpiredOnly]);

  const totalPages = Math.max(
    1,
    Math.ceil(visibleStockRecords.length / STOCK_ITEMS_PER_PAGE)
  );

  const paginatedStockRecords = useMemo(() => {
    const start = (currentPage - 1) * STOCK_ITEMS_PER_PAGE;
    return visibleStockRecords.slice(start, start + STOCK_ITEMS_PER_PAGE);
  }, [currentPage, visibleStockRecords]);

  useEffect(() => {
    setCurrentPage(1);
  }, [showExpiredOnly]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const toggleStockReport = () => {
    setShowReportOptions((current) => !current);
  };

  const exportStockCsv = () => {
    if (stockRecords.length === 0) {
      showToast("There is no stock data to export.", "info");
      return;
    }

    const headers = ["Medicine", "Total Item", "Stock Balance", "Status", "Expiry"];
    const rows = stockRecords.map((record) => {
      const quantity = Number(record.stockBalance);
      const stockLabel =
        quantity <= 20 ? "Critical" : quantity <= 50 ? "Low" : "Healthy";

      return [
        record.medicineName,
        record.totalItems,
        record.stockBalance,
        stockLabel,
        record.expiryDate,
      ];
    });

    downloadCsv(`stock-report-${getTodayLabel()}.csv`, [headers, ...rows]);
    setShowReportOptions(false);
    showToast("Stock report exported successfully.", "success");
  };

  const exportStockExcel = () => {
    if (stockRecords.length === 0) {
      showToast("There is no stock data to export.", "info");
      return;
    }

    const rows = stockRecords
      .map((record) => {
        const quantity = Number(record.stockBalance);
        const stockLabel =
          quantity <= 20 ? "Critical" : quantity <= 50 ? "Low" : "Healthy";

        return `
          <tr>
            <td>${escapeHtml(record.medicineName)}</td>
            <td>${escapeHtml(record.totalItems)}</td>
            <td>${escapeHtml(record.stockBalance)}</td>
            <td>${escapeHtml(stockLabel)}</td>
            <td>${escapeHtml(record.expiryDate)}</td>
          </tr>
        `;
      })
      .join("");

    downloadExcel(
      `stock-report-${getTodayLabel()}.xls`,
      `
        <table>
          <thead>
            <tr>
              <th>Medicine</th>
              <th>Total Item</th>
              <th>Stock Balance</th>
              <th>Status</th>
              <th>Expiry</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `
    );
    setShowReportOptions(false);
    showToast("Stock report exported as Excel.", "success");
  };

  const exportReorderList = () => {
    if (lowStockItems.length === 0) {
      showToast("No low-stock medicines need reordering right now.", "info");
      return;
    }

    const headers = ["Medicine", "Total Item", "Stock Balance", "Status", "Expiry"];
    const rows = lowStockItems.map((record) => {
      const quantity = Number(record.stockBalance);
      const stockLabel = quantity <= 20 ? "Critical" : "Low";

      return [
        record.medicineName,
        record.totalItems,
        record.stockBalance,
        stockLabel,
        record.expiryDate,
      ];
    });

    downloadCsv(`reorder-list-${getTodayLabel()}.csv`, [headers, ...rows]);
    showToast("Reorder list exported successfully.", "success");
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleMedicineSelection = (event: ChangeEvent<HTMLSelectElement>) => {
    const medicineItemId = event.target.value;
    const selectedRecord = stockRecords.find(
      (record) => String(record.medicineItemId) === medicineItemId
    );

    setForm((current) => ({
      ...current,
      medicineItemId,
      expiryDate: selectedRecord?.expiryDate ?? current.expiryDate,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      await saveStockMovement(
        {
          medicineItemId: Number(form.medicineItemId),
          quantity: form.quantity,
          operation: form.operation,
          expiryDate: form.expiryDate,
        },
        actor
      );
      await loadStock({ silent: true });
      setForm(emptyForm);
      showToast(
        form.operation === "add"
          ? "Stock added successfully."
          : "Stock deducted successfully.",
        "success"
      );
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Unable to update stock right now.",
        "error"
      );
    }
  };

  const toggleExpiredFilter = () => {
    setShowExpiredOnly((current) => !current);
  };

  if (loading) {
    return <section className="panel panel--wide">Loading stock...</section>;
  }

  if (error) {
    return <section className="panel panel--wide">{error}</section>;
  }

  return (
    <section className="dashboard-page">
      <div className="dashboard-hero">
        <div>
          <p className="eyebrow">Stock Overview</p>
          <h2>Inventory stock center</h2>
          <p className="dashboard-hero__text">
            Review current medicine counts, low-stock items, and upcoming expiries
            without changing your existing inventory workflow.
          </p>
        </div>
        <div ref={heroActionsRef} className="dashboard-hero__actions">
          <div className="hero-action-group">
            <button
              type="button"
              className="button button--primary"
              onClick={toggleStockReport}
            >
              Stock report
            </button>
            {showReportOptions ? (
              <div className="hero-action-menu">
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={exportStockExcel}
                >
                  <HiOutlineTableCells aria-hidden="true" /> Export Excel
                </button>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={exportStockCsv}
                >
                  <FiFileText aria-hidden="true" /> Export CSV
                </button>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="button button--secondary"
            onClick={exportReorderList}
          >
            Reorder list
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <article className="stat-card">
          <span>Stock items</span>
          <strong>{stockStats.totalItems}</strong>
          <p>Unique medicines currently tracked in the inventory list.</p>
        </article>
        <article className="stat-card">
          <span>Total units</span>
          <strong>{stockStats.totalUnits}</strong>
          <p>Combined quantity available across all medicine records.</p>
        </article>
        <article className="stat-card">
          <span>Low stock</span>
          <strong>{stockStats.lowStock}</strong>
          <p>Medicines at or below 50 units that may need restocking.</p>
        </article>
        <article className="stat-card">
          <span>Expiring soon</span>
          <strong>{stockStats.expiringSoon}</strong>
          <p>Medicines expiring within the next 30 days.</p>
        </article>
      </div>

      <section className="panel panel--wide">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Stock Management</p>
            <h3>Add or deduct inventory</h3>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="toolbar">
          <select
            name="medicineItemId"
            value={form.medicineItemId}
            onChange={handleMedicineSelection}
            required
          >
            <option value="" disabled>
              Select medicine item
            </option>
            {medicineItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <select
            name="operation"
            value={form.operation}
            onChange={handleChange}
          >
            <option value="add">Add stock</option>
            <option value="deduct">Deduct stock</option>
          </select>
          <input
            name="quantity"
            type="number"
            min="1"
            placeholder="Total item"
            value={form.quantity}
            onChange={handleChange}
            required
          />
          <input
            name="expiryDate"
            type="date"
            value={form.expiryDate}
            onChange={handleChange}
            required={form.operation === "add"}
          />
          <button type="submit" className="button button--primary">
            {form.operation === "add" ? "Save stock" : "Deduct stock"}
          </button>
        </form>
      </section>

      <section className="panel panel--wide">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Stock List</p>
            <h3>Current inventory levels</h3>
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

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Medicine</th>
                <th>Total item</th>
                <th>Stock balance</th>
                <th>Expiry</th>
              </tr>
            </thead>
            <tbody>
              {paginatedStockRecords.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    {showExpiredOnly
                      ? "No expired medicines found."
                      : "No stock data available yet."}
                  </td>
                </tr>
              ) : (
                paginatedStockRecords.map((record) => {
                  const expiryTone = getExpiryTone(record.expiryDate);

                  return (
                    <tr key={record.id}>
                      <td>{record.medicineName}</td>
                      <td>{record.totalItems}</td>
                      <td>{record.stockBalance}</td>
                      <td>
                        <div className={`stock-expiry stock-expiry--${expiryTone}`}>
                          <span>{record.expiryDate}</span>
                          {expiryTone === "expired" ? (
                            <span className="stock-expiry__label">Expired</span>
                          ) : expiryTone === "soon" ? (
                            <span className="stock-expiry__label">Expiring soon</span>
                          ) : (
                            <span className="stock-expiry__label">Valid</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {visibleStockRecords.length > 0 ? (
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
    </section>
  );
}

function willExpireSoon(dateValue: string): boolean {
  const today = new Date();
  const nextMonth = new Date();
  nextMonth.setDate(today.getDate() + 30);
  const expiry = new Date(dateValue);

  return expiry >= today && expiry <= nextMonth;
}

function isExpired(dateValue: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(dateValue);
  expiry.setHours(0, 0, 0, 0);

  return expiry < today;
}

function getExpiryTone(dateValue: string): "expired" | "soon" | "ok" {
  if (isExpired(dateValue)) {
    return "expired";
  }

  if (willExpireSoon(dateValue)) {
    return "soon";
  }

  return "ok";
}

function downloadCsv(filename: string, rows: Array<Array<string>>) {
  const csv = rows
    .map((row) =>
      row
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

function downloadExcel(filename: string, table: string) {
  const blob = new Blob([table], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

function getTodayLabel() {
  return new Date().toISOString().slice(0, 10);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export default StockPage;
