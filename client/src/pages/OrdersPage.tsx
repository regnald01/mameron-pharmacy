import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { FiFileText } from "react-icons/fi";
import { HiOutlineTableCells } from "react-icons/hi2";

import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  createOrder,
  deleteOrder,
  fetchMedicineItems,
  fetchOrders,
  updateOrder,
} from "../lib/api";
import type { DashboardStat, MedicineItemRecord, OrderRecord } from "../lib/api";

type OrderStatus = OrderRecord["status"];
type OrderPriority = OrderRecord["priority"];

type OrderForm = Omit<OrderRecord, "id">;
const ORDERS_PER_PAGE = 6;

const emptyForm: OrderForm = {
  customerName: "",
  prescriptionCode: "",
  medicineName: "",
  quantity: "1",
  status: "Pending",
  priority: "Medium",
  assignedTo: "",
  createdAtLabel: "Just now",
};

function OrdersPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const actor = user?.name ?? user?.email ?? "System";
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [medicineItems, setMedicineItems] = useState<MedicineItemRecord[]>([]);
  const [stats, setStats] = useState<DashboardStat[]>([]);
  const [form, setForm] = useState<OrderForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "All">("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const heroActionsRef = useRef<HTMLDivElement | null>(null);
  const orderQueueRef = useRef<HTMLElement | null>(null);

  const loadOrders = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setLoading(true);
      }

      try {
        const [ordersData, itemsData] = await Promise.all([
          fetchOrders(),
          fetchMedicineItems(),
        ]);
        setOrders(ordersData.orders);
        setStats(ordersData.stats);
        setMedicineItems(itemsData);
        setError(null);
      } catch {
        setError("Unable to load orders right now.");
        showToast("Unable to load orders right now.", "error");
      } finally {
        setLoading(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    let active = true;

    const syncOrders = async () => {
      if (!active) {
        return;
      }

      await loadOrders();
    };

    void syncOrders();

    return () => {
      active = false;
    };
  }, [loadOrders]);

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

  const visibleOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        order.customerName.toLowerCase().includes(search.toLowerCase()) ||
        order.prescriptionCode.toLowerCase().includes(search.toLowerCase()) ||
        order.medicineName.toLowerCase().includes(search.toLowerCase()) ||
        order.assignedTo.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === "All" || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(visibleOrders.length / ORDERS_PER_PAGE));

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * ORDERS_PER_PAGE;
    return visibleOrders.slice(start, start + ORDERS_PER_PAGE);
  }, [currentPage, visibleOrders]);

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
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await createOrder(form, actor);
      await loadOrders({ silent: true });
      setForm(emptyForm);
      showToast("Order created successfully.", "success");
    } catch {
      showToast("Unable to create order right now.", "error");
    }
  };

  const handleStatusChange = async (id: number, status: OrderStatus) => {
    try {
      await updateOrder(id, { status }, actor);
      await loadOrders({ silent: true });
      showToast("Order status updated successfully.", "success");
    } catch {
      showToast("Unable to update order status right now.", "error");
    }
  };

  const handlePriorityChange = async (id: number, priority: OrderPriority) => {
    try {
      await updateOrder(id, { priority }, actor);
      await loadOrders({ silent: true });
      showToast("Order priority updated successfully.", "success");
    } catch {
      showToast("Unable to update order priority right now.", "error");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteOrder(id, actor);
      await loadOrders({ silent: true });
      showToast("Order removed successfully.", "info");
    } catch {
      showToast("Unable to remove order right now.", "error");
    }
  };

  const handleReviewQueue = () => {
    setSearch("");
    setStatusFilter("Pending");
    setShowExportOptions(false);
    orderQueueRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    showToast("Showing pending orders in the review queue.", "info");
  };

  const toggleExportOrders = () => {
    setShowExportOptions((current) => !current);
  };

  const exportOrdersCsv = () => {
    if (visibleOrders.length === 0) {
      showToast("There are no orders to export.", "info");
      return;
    }

    const headers = [
      "Customer",
      "Prescription",
      "Medicine",
      "Quantity",
      "Priority",
      "Status",
      "Assigned To",
      "Created",
    ];
    const rows = visibleOrders.map((order) => [
      order.customerName,
      order.prescriptionCode,
      order.medicineName,
      order.quantity,
      order.priority,
      order.status,
      order.assignedTo,
      order.createdAtLabel,
    ]);

    const csv = [headers, ...rows]
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
    link.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    setShowExportOptions(false);
    showToast("Orders exported successfully.", "success");
  };

  const exportOrdersExcel = () => {
    if (visibleOrders.length === 0) {
      showToast("There are no orders to export.", "info");
      return;
    }

    const rows = visibleOrders
      .map(
        (order) => `
          <tr>
            <td>${escapeHtml(order.customerName)}</td>
            <td>${escapeHtml(order.prescriptionCode)}</td>
            <td>${escapeHtml(order.medicineName)}</td>
            <td>${escapeHtml(order.quantity)}</td>
            <td>${escapeHtml(order.priority)}</td>
            <td>${escapeHtml(order.status)}</td>
            <td>${escapeHtml(order.assignedTo)}</td>
            <td>${escapeHtml(order.createdAtLabel)}</td>
          </tr>
        `
      )
      .join("");

    const table = `
      <table>
        <thead>
          <tr>
            <th>Customer</th>
            <th>Prescription</th>
            <th>Medicine</th>
            <th>Quantity</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Assigned To</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;

    const blob = new Blob([table], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `orders-${new Date().toISOString().slice(0, 10)}.xls`;
    link.click();
    window.URL.revokeObjectURL(url);
    setShowExportOptions(false);
    showToast("Orders exported as Excel.", "success");
  };

  if (loading) {
    return <section className="panel panel--wide">Loading orders...</section>;
  }

  if (error) {
    return <section className="panel panel--wide">{error}</section>;
  }

  return (
    <section className="dashboard-page">
      <div className="dashboard-hero">
        <div>
          <p className="eyebrow">Order Center</p>
          <h2>Prescription requests and delivery follow-up</h2>
          <p className="dashboard-hero__text">
            Track pharmacy orders, update support handoffs, and keep delivery
            progress visible from one workspace.
          </p>
        </div>
        <div ref={heroActionsRef} className="dashboard-hero__actions">
          <div className="hero-action-group">
            <button
              type="button"
              className="button button--primary"
              onClick={handleReviewQueue}
            >
              Review queue
            </button>
          </div>
          <div className="hero-action-group">
            <button
              type="button"
              className="button button--secondary"
              onClick={toggleExportOrders}
            >
              Export orders
            </button>
            {showExportOptions ? (
              <div className="hero-action-menu">
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={exportOrdersExcel}
                >
                  <HiOutlineTableCells aria-hidden="true" /> Export Excel
                </button>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={exportOrdersCsv}
                >
                  <FiFileText aria-hidden="true" /> Export CSV
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="stats-grid">
        {stats.map((item) => (
          <article key={item.label} className="stat-card">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <p>{item.description}</p>
          </article>
        ))}
      </div>

      <section ref={orderQueueRef} className="panel panel--wide">
        <div className="panel__header">
          <div>
            <p className="eyebrow">New Order</p>
            <h3>Create a new prescription order</h3>
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
            name="prescriptionCode"
            placeholder="Prescription code"
            value={form.prescriptionCode}
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
            name="quantity"
            type="number"
            min="1"
            value={form.quantity}
            onChange={handleChange}
            required
          />
          <input
            name="assignedTo"
            placeholder="Assigned to"
            value={form.assignedTo}
            onChange={handleChange}
            required
          />
          <select name="priority" value={form.priority} onChange={handleChange}>
            <option value="High">High priority</option>
            <option value="Medium">Medium priority</option>
            <option value="Low">Low priority</option>
          </select>
          <button type="submit" className="button button--primary">
            Add order
          </button>
        </form>
      </section>

      <section className="panel panel--wide">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Order Queue</p>
            <h3>Manage requests and delivery updates</h3>
          </div>

          <div className="toolbar">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search customer, code, medicine, or owner"
              aria-label="Search orders"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as OrderStatus | "All")}
              aria-label="Filter orders by status"
            >
              <option value="All">All statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="In Transit">In Transit</option>
              <option value="Delivered">Delivered</option>
              <option value="Issue">Issue</option>
            </select>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Prescription</th>
                <th>Medicine</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assigned</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={8}>No matching orders found.</td>
                </tr>
              ) : (
                paginatedOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <strong>{order.customerName}</strong>
                      <p>{order.quantity} item(s)</p>
                    </td>
                    <td>{order.prescriptionCode}</td>
                    <td>{order.medicineName}</td>
                    <td>
                      <select
                        value={order.priority}
                        onChange={(event) =>
                          void handlePriorityChange(order.id, event.target.value as OrderPriority)
                        }
                      >
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </td>
                    <td>
                      <span className={`badge badge--${order.status.toLowerCase().replace(" ", "-")}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>{order.assignedTo}</td>
                    <td>{order.createdAtLabel}</td>
                    <td>
                      <div className="row-actions">
                        <select
                          value={order.status}
                          onChange={(event) =>
                            void handleStatusChange(order.id, event.target.value as OrderStatus)
                          }
                        >
                          <option value="Pending">Pending</option>
                          <option value="Approved">Approved</option>
                          <option value="In Transit">In Transit</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Issue">Issue</option>
                        </select>
                        <button
                          type="button"
                          className="button button--ghost"
                          onClick={() => void handleDelete(order.id)}
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

        {visibleOrders.length > 0 ? (
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

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export default OrdersPage;
