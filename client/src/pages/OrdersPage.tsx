import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  createOrder,
  deleteOrder,
  fetchOrders,
  updateOrder,
} from "../lib/api";
import type { DashboardStat, OrderRecord } from "../lib/api";

type OrderStatus = OrderRecord["status"];
type OrderPriority = OrderRecord["priority"];

type OrderForm = Omit<OrderRecord, "id">;

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
  const [stats, setStats] = useState<DashboardStat[]>([]);
  const [form, setForm] = useState<OrderForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "All">("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadOrders = async () => {
      try {
        const data = await fetchOrders();
        if (!active) {
          return;
        }

        setOrders(data.orders);
        setStats(data.stats);
        setError(null);
      } catch {
        if (!active) {
          return;
        }

        setError("Unable to load orders right now.");
        showToast("Unable to load orders right now.", "error");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadOrders();

    return () => {
      active = false;
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
      const createdOrder = await createOrder(form, actor);
      setOrders((current) => [createdOrder, ...current]);
      setForm(emptyForm);
      setStats((current) => recalculateOrderStats([createdOrder, ...orders], current));
      showToast("Order created successfully.", "success");
    } catch {
      showToast("Unable to create order right now.", "error");
    }
  };

  const handleStatusChange = async (id: number, status: OrderStatus) => {
    try {
      const nextOrder = await updateOrder(id, { status }, actor);
      const nextOrders = orders.map((order) => (order.id === id ? nextOrder : order));
      setOrders(nextOrders);
      setStats((current) => recalculateOrderStats(nextOrders, current));
      showToast("Order status updated successfully.", "success");
    } catch {
      showToast("Unable to update order status right now.", "error");
    }
  };

  const handlePriorityChange = async (id: number, priority: OrderPriority) => {
    try {
      const nextOrder = await updateOrder(id, { priority }, actor);
      setOrders((current) => current.map((order) => (order.id === id ? nextOrder : order)));
      showToast("Order priority updated successfully.", "success");
    } catch {
      showToast("Unable to update order priority right now.", "error");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteOrder(id, actor);
      const nextOrders = orders.filter((order) => order.id !== id);
      setOrders(nextOrders);
      setStats((current) => recalculateOrderStats(nextOrders, current));
      showToast("Order removed successfully.", "info");
    } catch {
      showToast("Unable to remove order right now.", "error");
    }
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
        <div className="dashboard-hero__actions">
          <button type="button" className="button button--primary">
            Review queue
          </button>
          <button type="button" className="button button--secondary">
            Export orders
          </button>
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

      <section className="panel panel--wide">
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
          <input
            name="medicineName"
            placeholder="Medicine"
            value={form.medicineName}
            onChange={handleChange}
            required
          />
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
              {visibleOrders.length === 0 ? (
                <tr>
                  <td colSpan={8}>No matching orders found.</td>
                </tr>
              ) : (
                visibleOrders.map((order) => (
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
      </section>
    </section>
  );
}

function recalculateOrderStats(
  orders: OrderRecord[],
  currentStats: DashboardStat[]
): DashboardStat[] {
  if (currentStats.length === 0) {
    return currentStats;
  }

  const pending = orders.filter((order) => order.status === "Pending").length;
  const inTransit = orders.filter((order) => order.status === "In Transit").length;
  const delivered = orders.filter((order) => order.status === "Delivered").length;
  const issues = orders.filter((order) => order.status === "Issue").length;

  return [
    {
      label: "Open orders",
      value: String(orders.length),
      description: `${pending} waiting for review or action`,
    },
    {
      label: "In transit",
      value: String(inTransit),
      description: "Orders currently moving to pickup or delivery",
    },
    {
      label: "Delivered",
      value: String(delivered),
      description: "Orders completed successfully in the current list",
    },
    {
      label: "Needs attention",
      value: String(issues),
      description: "Orders flagged with delivery or prescription issues",
    },
  ];
}

export default OrdersPage;
