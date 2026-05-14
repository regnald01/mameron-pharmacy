import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import jsPDF from "jspdf";
import { FiFileText } from "react-icons/fi";
import { HiOutlineTableCells } from "react-icons/hi2";

import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  createSale,
  fetchMedicines,
  deleteSale,
  fetchMedicineItems,
  fetchSales,
  updateSale,
} from "../lib/api";
import type {
  DashboardStat,
  MedicineItemRecord,
  MedicineRecord,
  SaleRecord,
} from "../lib/api";

type SaleStatus = SaleRecord["status"];
type PaymentMethod = SaleRecord["paymentMethod"];
type SaleForm = Omit<SaleRecord, "id">;
const SALES_PER_PAGE = 6;

const emptyForm: SaleForm = {
  customerName: "",
  invoiceCode: "",
  medicineName: "",
  units: "1",
  totalAmount: "",
  paymentMethod: "Cash",
  status: "Completed",
  cashierName: "",
  soldAtLabel: "Just now",
};

function SalesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const actor = user?.name ?? user?.email ?? "System";
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [medicineItems, setMedicineItems] = useState<MedicineItemRecord[]>([]);
  const [medicines, setMedicines] = useState<MedicineRecord[]>([]);
  const [stats, setStats] = useState<DashboardStat[]>([]);
  const [form, setForm] = useState<SaleForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<SaleStatus | "All">("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const heroActionsRef = useRef<HTMLDivElement | null>(null);

  const loadSales = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setLoading(true);
      }

      try {
        const [salesData, itemsData, medicinesData] = await Promise.all([
          fetchSales(),
          fetchMedicineItems(),
          fetchMedicines(),
        ]);
        setSales(salesData.sales);
        setStats(salesData.stats);
        setMedicineItems(itemsData);
        setMedicines(medicinesData);
        setError(null);
      } catch {
        setError("Unable to load sales right now.");
        showToast("Unable to load sales right now.", "error");
      } finally {
        setLoading(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    let active = true;

    const syncSales = async () => {
      if (!active) {
        return;
      }

      await loadSales();
    };

    void syncSales();

    return () => {
      active = false;
    };
  }, [loadSales]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (heroActionsRef.current?.contains(target)) {
        return;
      }

      setShowExportOptions(false);
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  const visibleSales = useMemo(() => {
    return sales.filter((sale) => {
      const query = search.toLowerCase();
      const matchesSearch =
        sale.customerName.toLowerCase().includes(query) ||
        sale.invoiceCode.toLowerCase().includes(query) ||
        sale.medicineName.toLowerCase().includes(query) ||
        sale.cashierName.toLowerCase().includes(query);

      const matchesStatus = statusFilter === "All" || sale.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [sales, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(visibleSales.length / SALES_PER_PAGE));

  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * SALES_PER_PAGE;
    return visibleSales.slice(start, start + SALES_PER_PAGE);
  }, [currentPage, visibleSales]);

  const totalAmountValue = useMemo(
    () => sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0),
    [sales]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;

    if (name === "medicineName") {
      const selectedMedicine = medicines.find((medicine) => medicine.name === value);

      setForm((current) => ({
        ...current,
        medicineName: value,
        totalAmount: selectedMedicine?.sellingPrice ?? current.totalAmount,
      }));
      return;
    }

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await createSale(form, actor);
      await loadSales({ silent: true });
      setForm(emptyForm);
      showToast("Sale recorded successfully.", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Unable to record sale right now.",
        "error"
      );
    }
  };

  const handleStatusChange = async (id: number, status: SaleStatus) => {
    try {
      await updateSale(id, { status }, actor);
      await loadSales({ silent: true });
      showToast("Sale status updated successfully.", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Unable to update sale status right now.",
        "error"
      );
    }
  };

  const handlePaymentChange = async (id: number, paymentMethod: PaymentMethod) => {
    try {
      await updateSale(id, { paymentMethod }, actor);
      await loadSales({ silent: true });
      showToast("Payment method updated successfully.", "success");
    } catch {
      showToast("Unable to update payment method right now.", "error");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteSale(id, actor);
      await loadSales({ silent: true });
      showToast("Sale removed successfully.", "info");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Unable to remove sale right now.",
        "error"
      );
    }
  };

  const handleShiftTotals = () => {
    const completedSales = visibleSales.filter((sale) => sale.status === "Completed");
    const totalRevenue = completedSales.reduce(
      (sum, sale) => sum + Number(sale.totalAmount),
      0
    );
    const pendingCount = visibleSales.filter((sale) => sale.status === "Pending").length;
    const refundedCount = visibleSales.filter((sale) => sale.status === "Refunded").length;

    setShowExportOptions(false);
    showToast(
      `Shift totals: ${completedSales.length} completed, $${totalRevenue.toFixed(2)} revenue, ${pendingCount} pending, ${refundedCount} refunded.`,
      "info"
    );
  };

  const toggleExportLedger = () => {
    setShowExportOptions((current) => !current);
  };

  const exportLedgerCsv = () => {
    if (visibleSales.length === 0) {
      showToast("There are no sales to export.", "info");
      return;
    }

    const headers = [
      "Customer",
      "Invoice",
      "Medicine",
      "Units",
      "Amount",
      "Payment",
      "Status",
      "Cashier",
      "Sold",
    ];
    const rows = visibleSales.map((sale) => [
      sale.customerName,
      sale.invoiceCode,
      sale.medicineName,
      sale.units,
      sale.totalAmount,
      sale.paymentMethod,
      sale.status,
      sale.cashierName,
      sale.soldAtLabel,
    ]);

    downloadCsv(`sales-ledger-${getTodayLabel()}.csv`, [headers, ...rows]);
    setShowExportOptions(false);
    showToast("Sales ledger exported successfully.", "success");
  };

  const exportLedgerExcel = () => {
    if (visibleSales.length === 0) {
      showToast("There are no sales to export.", "info");
      return;
    }

    const rows = visibleSales
      .map(
        (sale) => `
          <tr>
            <td>${escapeHtml(sale.customerName)}</td>
            <td>${escapeHtml(sale.invoiceCode)}</td>
            <td>${escapeHtml(sale.medicineName)}</td>
            <td>${escapeHtml(sale.units)}</td>
            <td>${escapeHtml(sale.totalAmount)}</td>
            <td>${escapeHtml(sale.paymentMethod)}</td>
            <td>${escapeHtml(sale.status)}</td>
            <td>${escapeHtml(sale.cashierName)}</td>
            <td>${escapeHtml(sale.soldAtLabel)}</td>
          </tr>
        `
      )
      .join("");

    downloadExcel(
      `sales-ledger-${getTodayLabel()}.xls`,
      `
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Invoice</th>
              <th>Medicine</th>
              <th>Units</th>
              <th>Amount</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Cashier</th>
              <th>Sold</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `
    );
    setShowExportOptions(false);
    showToast("Sales ledger exported as Excel.", "success");
  };

  const generateInvoiceReport = () => {
    if (visibleSales.length === 0) {
      showToast("There are no invoice records to report.", "info");
      return;
    }

    setShowExportOptions(false);
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 40;
    const contentWidth = pageWidth - margin * 2;
    const generatedAt = new Date().toLocaleString();
    const completedSales = visibleSales.filter((sale) => sale.status === "Completed");
    const totalRevenue = completedSales.reduce(
      (sum, sale) => sum + Number(sale.totalAmount),
      0
    );
    const averageSale =
      completedSales.length === 0 ? 0 : totalRevenue / completedSales.length;
    const refundedCount = visibleSales.filter((sale) => sale.status === "Refunded").length;
    let y = 0;

    const drawHeader = (isFirstPage: boolean) => {
      pdf.setFillColor(15, 118, 110);
      pdf.rect(0, 0, pageWidth, 112, "F");

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(22);
      pdf.setTextColor(255, 255, 255);
      pdf.text("Invoice Report", margin, 44);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(223, 242, 240);
      pdf.text("Mameron Pharmacy Sales Ledger", margin, 64);
      pdf.text(`Generated ${generatedAt}`, margin, 80);

      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(pageWidth - 160, 28, 120, 54, 16, 16, "F");
      pdf.setTextColor(15, 23, 42);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.text(`${visibleSales.length} invoices`, pageWidth - 145, 50);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.text("Current filtered report", pageWidth - 145, 66);

      y = 138;

      if (isFirstPage) {
        const cardWidth = (contentWidth - 24) / 3;
        const cards = [
          {
            label: "Completed Revenue",
            value: formatCurrency(totalRevenue),
            tone: [14, 165, 233] as const,
          },
          {
            label: "Average Sale",
            value: formatCurrency(averageSale),
            tone: [245, 158, 11] as const,
          },
          {
            label: "Refunded",
            value: String(refundedCount),
            tone: [239, 68, 68] as const,
          },
        ];

        cards.forEach((card, index) => {
          const x = margin + index * (cardWidth + 12);
          pdf.setFillColor(248, 250, 252);
          pdf.setDrawColor(226, 232, 240);
          pdf.roundedRect(x, y, cardWidth, 62, 16, 16, "FD");
          pdf.setFillColor(card.tone[0], card.tone[1], card.tone[2]);
          pdf.roundedRect(x + 14, y + 14, 8, 34, 4, 4, "F");
          pdf.setTextColor(71, 85, 105);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9);
          pdf.text(card.label, x + 32, y + 25);
          pdf.setTextColor(15, 23, 42);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(14);
          pdf.text(card.value, x + 32, y + 45);
        });

        y += 86;
      }

      pdf.setTextColor(15, 23, 42);
    };

    drawHeader(true);

    visibleSales.forEach((sale) => {
      const cardHeight = 122;

      if (y + cardHeight > pageHeight - 48) {
        pdf.addPage();
        drawHeader(false);
      }

      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(margin, y, contentWidth, cardHeight, 18, 18, "FD");

      pdf.setFillColor(15, 118, 110);
      pdf.roundedRect(margin, y, contentWidth, 30, 18, 18, "F");
      pdf.rect(margin, y + 14, contentWidth, 16, "F");

      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text(`Invoice ${sale.invoiceCode}`, margin + 18, y + 20);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.text(sale.soldAtLabel, pageWidth - margin - 18, y + 20, {
        align: "right",
      });

      pdf.setTextColor(15, 23, 42);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text("Customer", margin + 18, y + 50);
      pdf.text("Medicine", margin + 210, y + 50);
      pdf.text("Amount", margin + 402, y + 50);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text(
        pdf.splitTextToSize(sale.customerName, 150),
        margin + 18,
        y + 66
      );
      pdf.text(
        pdf.splitTextToSize(sale.medicineName, 150),
        margin + 210,
        y + 66
      );
      pdf.setFont("helvetica", "bold");
      pdf.text(formatCurrency(Number(sale.totalAmount)), margin + 402, y + 66);

      pdf.setDrawColor(226, 232, 240);
      pdf.line(margin + 18, y + 82, pageWidth - margin - 18, y + 82);

      const footerItems = [
        `Units: ${sale.units}`,
        `Payment: ${sale.paymentMethod}`,
        `Status: ${sale.status}`,
        `Cashier: ${sale.cashierName}`,
      ];

      footerItems.forEach((item, index) => {
        const x = margin + 18 + index * 130;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(71, 85, 105);
        pdf.text(item, x, y + 102);
      });

      y += cardHeight + 14;
    });

    pdf.save(`invoice-report-${getTodayLabel()}.pdf`);
    showToast("Invoice report generated as PDF.", "success");
  };

  if (loading) {
    return <section className="panel panel--wide">Loading sales...</section>;
  }

  if (error) {
    return <section className="panel panel--wide">{error}</section>;
  }

  return (
    <section className="dashboard-page">
      <div className="dashboard-hero">
        <div>
          <p className="eyebrow">Sales Analytics</p>
          <h2>Checkout activity and revenue tracking</h2>
          <p className="dashboard-hero__text">
            Review completed payments, monitor pending checkouts, and keep refund
            exceptions visible from the cashier and admin workspace.
          </p>
        </div>
        <div ref={heroActionsRef} className="dashboard-hero__actions">
          <div className="hero-action-group">
            <button
              type="button"
              className="button button--primary"
              onClick={handleShiftTotals}
            >
              Shift totals
            </button>
          </div>
          <div className="hero-action-group">
            <button
              type="button"
              className="button button--secondary"
              onClick={toggleExportLedger}
            >
              Export ledger
            </button>
            {showExportOptions ? (
              <div className="hero-action-menu">
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={exportLedgerExcel}
                >
                  <HiOutlineTableCells aria-hidden="true" /> Export Excel
                </button>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={exportLedgerCsv}
                >
                  <FiFileText aria-hidden="true" /> Export CSV
                </button>
              </div>
            ) : null}
          </div>
          <div className="hero-action-group">
            <button
              type="button"
              className="button button--secondary"
              onClick={generateInvoiceReport}
            >
              Invoice report
            </button>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <article className="stat-card">
          <span>Total amount</span>
          <strong>${totalAmountValue.toFixed(2)}</strong>
          <p>Combined amount across all sales currently recorded in the ledger.</p>
        </article>
        {stats
          .filter((item) => item.label !== "Transactions")
          .map((item) => (
            <article key={item.label} className="stat-card">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <p>{item.description}</p>
            </article>
          ))}
      </div>

      <section className="panel panel--wide">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Record Sale</p>
            <h3>Add a new transaction</h3>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="toolbar">
          <input
            name="customerName"
            placeholder="Customer name"
            value={form.customerName}
            onChange={handleChange}
            required
          />
          <input
            name="invoiceCode"
            placeholder="Invoice code"
            value={form.invoiceCode}
            onChange={handleChange}
            required
          />
          <select
            name="medicineName"
            value={form.medicineName}
            onChange={handleChange}
            required
          >
            <option value="" disabled>
              Select medicine
            </option>
            {medicineItems.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
          <input
            name="units"
            type="number"
            min="1"
            value={form.units}
            onChange={handleChange}
            required
          />
          <input
            name="totalAmount"
            type="number"
            min="0"
            step="0.01"
            placeholder="Total amount"
            value={form.totalAmount}
            onChange={handleChange}
            required
          />
          <input
            name="cashierName"
            placeholder="Cashier"
            value={form.cashierName}
            onChange={handleChange}
            required
          />
          <select name="paymentMethod" value={form.paymentMethod} onChange={handleChange}>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="Mobile">Mobile</option>
            <option value="Insurance">Insurance</option>
          </select>
          <button type="submit" className="button button--primary">
            Add sale
          </button>
        </form>
      </section>

      <section className="panel panel--wide">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Sales Ledger</p>
            <h3>Review revenue and payment activity</h3>
          </div>

          <div className="toolbar">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search customer, invoice, medicine, or cashier"
              aria-label="Search sales"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as SaleStatus | "All")}
              aria-label="Filter sales by status"
            >
              <option value="All">All statuses</option>
              <option value="Completed">Completed</option>
              <option value="Pending">Pending</option>
              <option value="Refunded">Refunded</option>
            </select>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Invoice</th>
                <th>Medicine</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Cashier</th>
                <th>Sold</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSales.length === 0 ? (
                <tr>
                  <td colSpan={9}>No matching sales found.</td>
                </tr>
              ) : (
                paginatedSales.map((sale) => (
                  <tr key={sale.id}>
                    <td>
                      <strong>{sale.customerName}</strong>
                      <p>{sale.units} unit(s)</p>
                    </td>
                    <td>{sale.invoiceCode}</td>
                    <td>{sale.medicineName}</td>
                    <td>${sale.totalAmount}</td>
                    <td>
                      <select
                        value={sale.paymentMethod}
                        onChange={(event) =>
                          void handlePaymentChange(sale.id, event.target.value as PaymentMethod)
                        }
                      >
                        <option value="Cash">Cash</option>
                        <option value="Card">Card</option>
                        <option value="Mobile">Mobile</option>
                        <option value="Insurance">Insurance</option>
                      </select>
                    </td>
                    <td>
                      <span className={`badge badge--${sale.status.toLowerCase()}`}>
                        {sale.status}
                      </span>
                    </td>
                    <td>{sale.cashierName}</td>
                    <td>{sale.soldAtLabel}</td>
                    <td>
                      <div className="row-actions">
                        <select
                          value={sale.status}
                          onChange={(event) =>
                            void handleStatusChange(sale.id, event.target.value as SaleStatus)
                          }
                        >
                          <option value="Completed">Completed</option>
                          <option value="Pending">Pending</option>
                          <option value="Refunded">Refunded</option>
                        </select>
                        <button
                          type="button"
                          className="button button--ghost"
                          onClick={() => void handleDelete(sale.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {visibleSales.length > 0 ? (
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

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export default SalesPage;
