import { useEffect, useMemo, useRef, useState } from "react";
import { FiFileText } from "react-icons/fi";
import { HiOutlineTableCells } from "react-icons/hi2";

import { useToast } from "../context/ToastContext";
import { fetchMedicines } from "../lib/api";
import type { MedicineRecord } from "../lib/api";

const STOCK_ITEMS_PER_PAGE = 6;

function StockPage() {
  const { showToast } = useToast();
  const [medicines, setMedicines] = useState<MedicineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReportOptions, setShowReportOptions] = useState(false);
  const [showExpiredOnly, setShowExpiredOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const heroActionsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;

    const loadStock = async () => {
      try {
        const data = await fetchMedicines();
        if (!active) {
          return;
        }

        setMedicines(data);
        setError(null);
      } catch {
        if (!active) {
          return;
        }

        setError("Unable to load stock right now.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadStock();

    return () => {
      active = false;
    };
  }, []);

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
    const totalItems = medicines.length;
    const totalUnits = medicines.reduce(
      (sum, medicine) => sum + Number(medicine.quantity),
      0
    );
    const lowStock = medicines.filter((medicine) => Number(medicine.quantity) <= 50).length;
    const expiringSoon = medicines.filter((medicine) =>
      willExpireSoon(medicine.expiryDate)
    ).length;

    return { totalItems, totalUnits, lowStock, expiringSoon };
  }, [medicines]);

  const lowStockItems = useMemo(
    () => medicines.filter((medicine) => Number(medicine.quantity) <= 50),
    [medicines]
  );

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
    Math.ceil(visibleMedicines.length / STOCK_ITEMS_PER_PAGE)
  );

  const paginatedMedicines = useMemo(() => {
    const start = (currentPage - 1) * STOCK_ITEMS_PER_PAGE;
    return visibleMedicines.slice(start, start + STOCK_ITEMS_PER_PAGE);
  }, [currentPage, visibleMedicines]);

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
    if (medicines.length === 0) {
      showToast("There is no stock data to export.", "info");
      return;
    }

    const headers = ["Medicine", "Stock", "Status", "Expiry", "Selling Price"];
    const rows = medicines.map((medicine) => {
      const quantity = Number(medicine.quantity);
      const stockLabel =
        quantity <= 20 ? "Critical" : quantity <= 50 ? "Low" : "Healthy";

      return [
        medicine.name,
        medicine.quantity,
        stockLabel,
        medicine.expiryDate,
        medicine.sellingPrice,
      ];
    });

    downloadCsv(`stock-report-${getTodayLabel()}.csv`, [headers, ...rows]);
    setShowReportOptions(false);
    showToast("Stock report exported successfully.", "success");
  };

  const exportStockExcel = () => {
    if (medicines.length === 0) {
      showToast("There is no stock data to export.", "info");
      return;
    }

    const rows = medicines
      .map((medicine) => {
        const quantity = Number(medicine.quantity);
        const stockLabel =
          quantity <= 20 ? "Critical" : quantity <= 50 ? "Low" : "Healthy";

        return `
          <tr>
            <td>${escapeHtml(medicine.name)}</td>
            <td>${escapeHtml(medicine.quantity)}</td>
            <td>${escapeHtml(stockLabel)}</td>
            <td>${escapeHtml(medicine.expiryDate)}</td>
            <td>${escapeHtml(medicine.sellingPrice)}</td>
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
              <th>Stock</th>
              <th>Status</th>
              <th>Expiry</th>
              <th>Selling Price</th>
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

    const headers = ["Medicine", "Stock", "Status", "Expiry", "Selling Price"];
    const rows = lowStockItems.map((medicine) => {
      const quantity = Number(medicine.quantity);
      const stockLabel = quantity <= 20 ? "Critical" : "Low";

      return [
        medicine.name,
        medicine.quantity,
        stockLabel,
        medicine.expiryDate,
        medicine.sellingPrice,
      ];
    });

    downloadCsv(`reorder-list-${getTodayLabel()}.csv`, [headers, ...rows]);
    showToast("Reorder list exported successfully.", "success");
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
                <th>Stock</th>
                <th>Status</th>
                <th>Expiry</th>
                <th>Selling price</th>
              </tr>
            </thead>
            <tbody>
              {paginatedMedicines.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    {showExpiredOnly
                      ? "No expired medicines found."
                      : "No stock data available yet."}
                  </td>
                </tr>
              ) : (
                paginatedMedicines.map((medicine) => {
                  const quantity = Number(medicine.quantity);
                  const stockLabel =
                    quantity <= 20 ? "Critical" : quantity <= 50 ? "Low" : "Healthy";
                  const expiryTone = getExpiryTone(medicine.expiryDate);

                  return (
                    <tr key={medicine.id}>
                      <td>{medicine.name}</td>
                      <td>{medicine.quantity}</td>
                      <td>
                        <span className={`badge badge--${stockLabel.toLowerCase()}`}>
                          {stockLabel}
                        </span>
                      </td>
                      <td>
                        <div className={`stock-expiry stock-expiry--${expiryTone}`}>
                          <span>{medicine.expiryDate}</span>
                          {expiryTone === "expired" ? (
                            <span className="stock-expiry__label">Expired</span>
                          ) : expiryTone === "soon" ? (
                            <span className="stock-expiry__label">Expiring soon</span>
                          ) : (
                            <span className="stock-expiry__label">Valid</span>
                          )}
                        </div>
                      </td>
                      <td>{medicine.sellingPrice}</td>
                    </tr>
                  );
                })
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
