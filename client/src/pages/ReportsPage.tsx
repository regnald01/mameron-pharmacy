import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import jsPDF from "jspdf";
import { FiFileText } from "react-icons/fi";
import { HiOutlineTableCells } from "react-icons/hi2";

import { useToast } from "../context/ToastContext";
import {
  fetchMedicineItems,
  fetchMedicines,
  fetchOrders,
  fetchSales,
  fetchStockRecords,
} from "../lib/api";
import type {
  MedicineItemRecord,
  MedicineRecord,
  OrderRecord,
  SaleRecord,
  StockRecord,
} from "../lib/api";

function ReportsPage() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [medicines, setMedicines] = useState<MedicineRecord[]>([]);
  const [items, setItems] = useState<MedicineItemRecord[]>([]);
  const [stocks, setStocks] = useState<StockRecord[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDownloadMenu, setActiveDownloadMenu] = useState<string | null>(null);
  const downloadMenuRef = useRef<HTMLDivElement | null>(null);

  const loadReports = useCallback(async () => {
    setLoading(true);

    try {
      const [ordersData, medicinesData, itemsData, stocksData, salesData] =
        await Promise.all([
          fetchOrders(),
          fetchMedicines(),
          fetchMedicineItems(),
          fetchStockRecords(),
          fetchSales(),
        ]);

      setOrders(ordersData.orders);
      setMedicines(medicinesData);
      setItems(itemsData);
      setStocks(stocksData);
      setSales(salesData.sales);
      setError(null);
    } catch {
      setError("Unable to load reports right now.");
      showToast("Unable to load reports right now.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    let active = true;

    const syncReports = async () => {
      if (!active) {
        return;
      }

      await loadReports();
    };

    void syncReports();

    return () => {
      active = false;
    };
  }, [loadReports]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (downloadMenuRef.current?.contains(target)) {
        return;
      }

      setActiveDownloadMenu(null);
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  const reportStats = useMemo(() => {
    const expiredMedicines = medicines.filter((medicine) => isExpired(medicine.expiryDate)).length;
    const lowStock = stocks.filter((stock) => Number(stock.stockBalance) <= 50).length;
    const expiredStock = stocks.filter((stock) => isExpired(stock.expiryDate)).length;
    const completedSales = sales.filter((sale) => sale.status === "Completed");
    const revenue = completedSales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);

    return {
      orders: orders.length,
      medicines: medicines.length,
      items: items.length,
      stockUnits: stocks.reduce((sum, stock) => sum + Number(stock.stockBalance), 0),
      lowStock,
      expiredMedicines,
      expiredStock,
      sales: sales.length,
      revenue,
    };
  }, [items, medicines, orders, sales, stocks]);

  const recentOrders = useMemo(() => [...orders].slice(-5).reverse(), [orders]);
  const recentMedicines = useMemo(() => [...medicines].slice(-5).reverse(), [medicines]);
  const recentItems = useMemo(() => [...items].slice(-5).reverse(), [items]);
  const recentStocks = useMemo(() => [...stocks].slice(-5).reverse(), [stocks]);
  const recentSales = useMemo(() => [...sales].slice(-5).reverse(), [sales]);

  const orderSection = useMemo<ReportSection>(
    () => ({
      title: "Orders Report",
      filename: `orders-report-${getTodayLabel()}`,
      headers: ["Prescription", "Customer", "Medicine", "Quantity", "Priority", "Status", "Assigned To", "Created"],
      rows: orders.map((order) => [
        order.prescriptionCode,
        order.customerName,
        order.medicineName,
        order.quantity,
        order.priority,
        order.status,
        order.assignedTo,
        order.createdAtLabel,
      ]),
    }),
    [orders]
  );

  const medicineSection = useMemo<ReportSection>(
    () => ({
      title: "Medicines Report",
      filename: `medicines-report-${getTodayLabel()}`,
      headers: ["Name", "Purchase Price", "Selling Price", "Quantity", "Expiry"],
      rows: medicines.map((medicine) => [
        medicine.name,
        medicine.purchasePrice,
        medicine.sellingPrice,
        medicine.quantity,
        medicine.expiryDate,
      ]),
    }),
    [medicines]
  );

  const itemsSection = useMemo<ReportSection>(
    () => ({
      title: "Items Report",
      filename: `items-report-${getTodayLabel()}`,
      headers: ["Item ID", "Medicine Item Name"],
      rows: items.map((item) => [String(item.id), item.name]),
    }),
    [items]
  );

  const stockSection = useMemo<ReportSection>(
    () => ({
      title: "Stock Report",
      filename: `stock-report-${getTodayLabel()}`,
      headers: ["Medicine", "Total Items", "Available Stock", "Expiry", "Status"],
      rows: stocks.map((stock) => [
        stock.medicineName,
        stock.totalItems,
        stock.stockBalance,
        stock.expiryDate,
        getStockStatusLabel(stock),
      ]),
    }),
    [stocks]
  );

  const salesSection = useMemo<ReportSection>(
    () => ({
      title: "Sales Report",
      filename: `sales-report-${getTodayLabel()}`,
      headers: ["Invoice", "Customer", "Medicine", "Units", "Amount", "Payment", "Status", "Cashier", "Sold At"],
      rows: sales.map((sale) => [
        sale.invoiceCode,
        sale.customerName,
        sale.medicineName,
        sale.units,
        sale.totalAmount,
        sale.paymentMethod,
        sale.status,
        sale.cashierName,
        sale.soldAtLabel,
      ]),
    }),
    [sales]
  );

  const allSections = useMemo(
    () => [orderSection, medicineSection, itemsSection, stockSection, salesSection],
    [itemsSection, medicineSection, orderSection, salesSection, stockSection]
  );

  const toggleDownloadMenu = (menuId: string) => {
    setActiveDownloadMenu((current) => (current === menuId ? null : menuId));
  };

  const exportSectionAsExcel = (section: ReportSection) => {
    if (section.rows.length === 0) {
      showToast(`There is no ${section.title.toLowerCase()} data to download.`, "info");
      return;
    }

    downloadExcel(`${section.filename}.xls`, buildExcelMarkup([section]));
    setActiveDownloadMenu(null);
    showToast(`${section.title} downloaded as Excel.`, "success");
  };

  const exportSectionAsPdf = (section: ReportSection) => {
    if (section.rows.length === 0) {
      showToast(`There is no ${section.title.toLowerCase()} data to download.`, "info");
      return;
    }

    downloadPdf(`${section.filename}.pdf`, [section]);
    setActiveDownloadMenu(null);
    showToast(`${section.title} downloaded as PDF.`, "success");
  };

  const exportAllReports = (format: "excel" | "pdf") => {
    if (allSections.every((section) => section.rows.length === 0)) {
      showToast("There is no report data to download.", "info");
      return;
    }

    if (format === "excel") {
      downloadExcel(`all-reports-${getTodayLabel()}.xls`, buildExcelMarkup(allSections));
      showToast("All reports downloaded as Excel.", "success");
    } else {
      downloadPdf(`all-reports-${getTodayLabel()}.pdf`, allSections);
      showToast("All reports downloaded as PDF.", "success");
    }

    setActiveDownloadMenu(null);
  };

  if (loading) {
    return <section className="panel panel--wide">Loading reports...</section>;
  }

  if (error) {
    return <section className="panel panel--wide">{error}</section>;
  }

  return (
    <section ref={downloadMenuRef} className="dashboard-page">
      <div className="dashboard-hero">
        <div>
          <p className="eyebrow">Reports Center</p>
          <h2>Operational reports overview</h2>
          <p className="dashboard-hero__text">
            Review a single snapshot of orders, medicines, items, stock, and sales
            from one page.
          </p>
        </div>
        <div className="dashboard-hero__actions">
          <div className="hero-action-group">
            <button
              type="button"
              className="button button--primary"
              onClick={() => toggleDownloadMenu("all")}
            >
              <HiOutlineTableCells aria-hidden="true" /> Download all reports
            </button>
            {activeDownloadMenu === "all" ? (
              <div className="hero-action-menu">
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() => exportAllReports("excel")}
                >
                  <HiOutlineTableCells aria-hidden="true" /> Export Excel
                </button>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() => exportAllReports("pdf")}
                >
                  <FiFileText aria-hidden="true" /> Export PDF
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <article className="stat-card">
          <span>Total orders</span>
          <strong>{reportStats.orders}</strong>
          <p>All recorded prescription and fulfillment orders.</p>
        </article>
        <article className="stat-card">
          <span>Medicine records</span>
          <strong>{reportStats.medicines}</strong>
          <p>{reportStats.expiredMedicines} expired medicine entries in the current list.</p>
        </article>
        <article className="stat-card">
          <span>Tracked stock units</span>
          <strong>{reportStats.stockUnits}</strong>
          <p>{reportStats.lowStock} stock records are currently low.</p>
        </article>
        <article className="stat-card">
          <span>Sales revenue</span>
          <strong>${reportStats.revenue.toFixed(2)}</strong>
          <p>{reportStats.sales} sales recorded across the current ledger.</p>
        </article>
      </div>

      <section className="panel panel--wide">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Orders Report</p>
            <h3>Recent order activity</h3>
          </div>
          <div className="row-actions">
            <span className="badge badge--healthy">{orders.length} orders</span>
            <div className="hero-action-group">
              <button
                type="button"
                className="button button--ghost"
                onClick={() => toggleDownloadMenu("orders")}
              >
                <FiFileText aria-hidden="true" /> Download
              </button>
              {activeDownloadMenu === "orders" ? (
                <div className="hero-action-menu">
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={() => exportSectionAsExcel(orderSection)}
                  >
                    <HiOutlineTableCells aria-hidden="true" /> Export Excel
                  </button>
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={() => exportSectionAsPdf(orderSection)}
                  >
                    <FiFileText aria-hidden="true" /> Export PDF
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Prescription</th>
                <th>Customer</th>
                <th>Medicine</th>
                <th>Quantity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5}>No order data available.</td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.prescriptionCode}</td>
                    <td>{order.customerName}</td>
                    <td>{order.medicineName}</td>
                    <td>{order.quantity}</td>
                    <td>{order.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel panel--wide">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Medicines Report</p>
            <h3>Recent medicine records</h3>
          </div>
          <div className="row-actions">
            <span className="badge badge--healthy">{medicines.length} medicines</span>
            <div className="hero-action-group">
              <button
                type="button"
                className="button button--ghost"
                onClick={() => toggleDownloadMenu("medicines")}
              >
                <FiFileText aria-hidden="true" /> Download
              </button>
              {activeDownloadMenu === "medicines" ? (
                <div className="hero-action-menu">
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={() => exportSectionAsExcel(medicineSection)}
                  >
                    <HiOutlineTableCells aria-hidden="true" /> Export Excel
                  </button>
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={() => exportSectionAsPdf(medicineSection)}
                  >
                    <FiFileText aria-hidden="true" /> Export PDF
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Purchase</th>
                <th>Selling</th>
                <th>Quantity</th>
                <th>Expiry</th>
              </tr>
            </thead>
            <tbody>
              {recentMedicines.length === 0 ? (
                <tr>
                  <td colSpan={5}>No medicine data available.</td>
                </tr>
              ) : (
                recentMedicines.map((medicine) => (
                  <tr key={medicine.id}>
                    <td>{medicine.name}</td>
                    <td>{medicine.purchasePrice}</td>
                    <td>{medicine.sellingPrice}</td>
                    <td>{medicine.quantity}</td>
                    <td>{medicine.expiryDate}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel panel--wide">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Items Report</p>
            <h3>Registered medicine items</h3>
          </div>
          <div className="row-actions">
            <span className="badge badge--healthy">{items.length} items</span>
            <div className="hero-action-group">
              <button
                type="button"
                className="button button--ghost"
                onClick={() => toggleDownloadMenu("items")}
              >
                <FiFileText aria-hidden="true" /> Download
              </button>
              {activeDownloadMenu === "items" ? (
                <div className="hero-action-menu">
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={() => exportSectionAsExcel(itemsSection)}
                  >
                    <HiOutlineTableCells aria-hidden="true" /> Export Excel
                  </button>
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={() => exportSectionAsPdf(itemsSection)}
                  >
                    <FiFileText aria-hidden="true" /> Export PDF
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Item ID</th>
                <th>Medicine item name</th>
              </tr>
            </thead>
            <tbody>
              {recentItems.length === 0 ? (
                <tr>
                  <td colSpan={2}>No item data available.</td>
                </tr>
              ) : (
                recentItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.name}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel panel--wide">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Stock Report</p>
            <h3>Current stock snapshot</h3>
          </div>
          <div className="row-actions">
            <span className="badge badge--healthy">{stocks.length} stock records</span>
            <div className="hero-action-group">
              <button
                type="button"
                className="button button--ghost"
                onClick={() => toggleDownloadMenu("stock")}
              >
                <FiFileText aria-hidden="true" /> Download
              </button>
              {activeDownloadMenu === "stock" ? (
                <div className="hero-action-menu">
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={() => exportSectionAsExcel(stockSection)}
                  >
                    <HiOutlineTableCells aria-hidden="true" /> Export Excel
                  </button>
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={() => exportSectionAsPdf(stockSection)}
                  >
                    <FiFileText aria-hidden="true" /> Export PDF
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Medicine</th>
                <th>Total items</th>
                <th>Available stock</th>
                <th>Expiry</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentStocks.length === 0 ? (
                <tr>
                  <td colSpan={5}>No stock data available.</td>
                </tr>
              ) : (
                recentStocks.map((stock) => (
                  <tr key={stock.id}>
                    <td>{stock.medicineName}</td>
                    <td>{stock.totalItems}</td>
                    <td>{stock.stockBalance}</td>
                    <td>{stock.expiryDate}</td>
                    <td>{getStockStatusLabel(stock)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel panel--wide">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Sales Report</p>
            <h3>Recent sales summary</h3>
          </div>
          <div className="row-actions">
            <span className="badge badge--healthy">{sales.length} sales</span>
            <div className="hero-action-group">
              <button
                type="button"
                className="button button--ghost"
                onClick={() => toggleDownloadMenu("sales")}
              >
                <FiFileText aria-hidden="true" /> Download
              </button>
              {activeDownloadMenu === "sales" ? (
                <div className="hero-action-menu">
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={() => exportSectionAsExcel(salesSection)}
                  >
                    <HiOutlineTableCells aria-hidden="true" /> Export Excel
                  </button>
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={() => exportSectionAsPdf(salesSection)}
                  >
                    <FiFileText aria-hidden="true" /> Export PDF
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Medicine</th>
                <th>Units</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.length === 0 ? (
                <tr>
                  <td colSpan={6}>No sales data available.</td>
                </tr>
              ) : (
                recentSales.map((sale) => (
                  <tr key={sale.id}>
                    <td>{sale.invoiceCode}</td>
                    <td>{sale.customerName}</td>
                    <td>{sale.medicineName}</td>
                    <td>{sale.units}</td>
                    <td>${Number(sale.totalAmount).toFixed(2)}</td>
                    <td>{sale.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

function isExpired(date: string): boolean {
  return new Date(date) < new Date();
}

function getStockStatusLabel(stock: StockRecord): string {
  if (isExpired(stock.expiryDate)) {
    return "Expired";
  }

  const quantity = Number(stock.stockBalance);
  if (quantity <= 20) {
    return "Critical";
  }
  if (quantity <= 50) {
    return "Low";
  }

  return "Healthy";
}

export default ReportsPage;

interface ReportSection {
  title: string;
  filename: string;
  headers: string[];
  rows: string[][];
}

function buildExcelMarkup(sections: ReportSection[]): string {
  return sections
    .map(
      (section) => `
        <table>
          <thead>
            <tr><th colspan="${section.headers.length}">${escapeHtml(section.title)}</th></tr>
            <tr>${section.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${
              section.rows.length === 0
                ? `<tr><td colspan="${section.headers.length}">No data available.</td></tr>`
                : section.rows
                    .map(
                      (row) =>
                        `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`
                    )
                    .join("")
            }
          </tbody>
        </table>
        <br />
      `
    )
    .join("");
}

function downloadExcel(filename: string, tableMarkup: string) {
  const content = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
      </head>
      <body>${tableMarkup}</body>
    </html>
  `;

  const blob = new Blob([content], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

function downloadPdf(filename: string, sections: ReportSection[]) {
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
  const totalRows = sections.reduce((sum, section) => sum + section.rows.length, 0);
  let y = 0;

  const summaryCards = [
    { label: "Sections", value: String(sections.length), tone: [14, 165, 233] as const },
    { label: "Rows", value: String(totalRows), tone: [245, 158, 11] as const },
    { label: "Generated", value: generatedAt.split(",")[0] ?? generatedAt, tone: [15, 118, 110] as const },
  ];

  const drawHeader = (showCards: boolean) => {
    pdf.setFillColor(15, 118, 110);
    pdf.rect(0, 0, pageWidth, 116, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(22);
    pdf.setTextColor(255, 255, 255);
    pdf.text("Pharmacy Reports", margin, 44);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(223, 242, 240);
    pdf.text("Mameron Pharmacy Operational Summary", margin, 64);
    pdf.text(`Generated ${generatedAt}`, margin, 80);

    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(pageWidth - 170, 26, 130, 58, 16, 16, "F");
    pdf.setTextColor(15, 23, 42);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text(`${sections.length} report sections`, pageWidth - 155, 50);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(`${totalRows} data rows`, pageWidth - 155, 68);

    y = 142;

    if (showCards) {
      const cardWidth = (contentWidth - 24) / 3;

      summaryCards.forEach((card, index) => {
        const x = margin + index * (cardWidth + 12);

        pdf.setFillColor(248, 250, 252);
        pdf.setDrawColor(226, 232, 240);
        pdf.roundedRect(x, y, cardWidth, 64, 16, 16, "FD");

        pdf.setFillColor(card.tone[0], card.tone[1], card.tone[2]);
        pdf.roundedRect(x + 14, y + 14, 8, 36, 4, 4, "F");

        pdf.setTextColor(71, 85, 105);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.text(card.label, x + 32, y + 26);

        pdf.setTextColor(15, 23, 42);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(14);
        pdf.text(card.value, x + 32, y + 46);
      });

      y += 88;
    }

    pdf.setTextColor(15, 23, 42);
  };

  const ensureSpace = (height: number) => {
    if (y + height <= pageHeight - 40) {
      return;
    }

    pdf.addPage();
    drawHeader(false);
  };

  drawHeader(true);

  const drawSectionShell = (section: ReportSection, startY: number) => {
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(margin, startY, contentWidth, pageHeight - startY - 44, 18, 18, "FD");

    pdf.setFillColor(15, 118, 110);
    pdf.roundedRect(margin, startY, contentWidth, 34, 18, 18, "F");
    pdf.rect(margin, startY + 16, contentWidth, 18, "F");

    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text(section.title, margin + 18, startY + 22);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(`${section.rows.length} rows`, pageWidth - margin - 18, startY + 22, {
      align: "right",
    });

    let sectionY = startY + 54;
    pdf.setTextColor(71, 85, 105);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    const wrappedHeaders = pdf.splitTextToSize(section.headers.join(" | "), contentWidth - 42);
    pdf.text(wrappedHeaders, margin + 18, sectionY);
    sectionY += wrappedHeaders.length * 11 + 8;

    pdf.setDrawColor(226, 232, 240);
    pdf.line(margin + 18, sectionY, pageWidth - margin - 18, sectionY);
    sectionY += 16;

    pdf.setTextColor(15, 23, 42);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);

    return sectionY;
  };

  sections.forEach((section, sectionIndex) => {
    ensureSpace(160);

    let sectionY = drawSectionShell(section, y);

    if (section.rows.length === 0) {
      pdf.text("No data available.", margin + 18, sectionY);
      y = sectionY + 26;
      return;
    }

    section.rows.forEach((row, rowIndex) => {
      const wrappedRow = pdf.splitTextToSize(row.join(" | "), contentWidth - 42);
      const rowHeight = wrappedRow.length * 11 + 10;

      if (sectionY + rowHeight > pageHeight - 58) {
        pdf.addPage();
        drawHeader(false);
        sectionY = drawSectionShell(section, y);
      }

      if (rowIndex % 2 === 0) {
        pdf.setFillColor(248, 250, 252);
        pdf.roundedRect(margin + 12, sectionY - 10, contentWidth - 24, rowHeight, 8, 8, "F");
      }

      pdf.setTextColor(15, 23, 42);
      pdf.text(wrappedRow, margin + 18, sectionY);
      sectionY += rowHeight;
    });

    y = sectionY + 18;

    if (sectionIndex < sections.length - 1) {
      ensureSpace(24);
    }
  });

  pdf.save(filename);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getTodayLabel(): string {
  return new Date().toISOString().slice(0, 10);
}
