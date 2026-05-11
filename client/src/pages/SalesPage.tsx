import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

import {
  createSale,
  deleteSale,
  fetchSales,
  updateSale,
} from "../lib/api";
import type { DashboardStat, SaleRecord } from "../lib/api";

type SaleStatus = SaleRecord["status"];
type PaymentMethod = SaleRecord["paymentMethod"];
type SaleForm = Omit<SaleRecord, "id">;

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
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [stats, setStats] = useState<DashboardStat[]>([]);
  const [form, setForm] = useState<SaleForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<SaleStatus | "All">("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadSales = async () => {
      try {
        const data = await fetchSales();
        if (!active) {
          return;
        }

        setSales(data.sales);
        setStats(data.stats);
        setError(null);
      } catch {
        if (!active) {
          return;
        }

        setError("Unable to load sales right now.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadSales();

    return () => {
      active = false;
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
    const createdSale = await createSale(form);
    const nextSales = [createdSale, ...sales];
    setSales(nextSales);
    setStats(recalculateSaleStats(nextSales));
    setForm(emptyForm);
  };

  const handleStatusChange = async (id: number, status: SaleStatus) => {
    const nextSale = await updateSale(id, { status });
    const nextSales = sales.map((sale) => (sale.id === id ? nextSale : sale));
    setSales(nextSales);
    setStats(recalculateSaleStats(nextSales));
  };

  const handlePaymentChange = async (id: number, paymentMethod: PaymentMethod) => {
    const nextSale = await updateSale(id, { paymentMethod });
    setSales((current) => current.map((sale) => (sale.id === id ? nextSale : sale)));
  };

  const handleDelete = async (id: number) => {
    await deleteSale(id);
    const nextSales = sales.filter((sale) => sale.id !== id);
    setSales(nextSales);
    setStats(recalculateSaleStats(nextSales));
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
        <div className="dashboard-hero__actions">
          <button type="button" className="button button--primary">
            Shift totals
          </button>
          <button type="button" className="button button--secondary">
            Export ledger
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
          <input
            name="medicineName"
            placeholder="Medicine"
            value={form.medicineName}
            onChange={handleChange}
            required
          />
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
              {visibleSales.length === 0 ? (
                <tr>
                  <td colSpan={9}>No matching sales found.</td>
                </tr>
              ) : (
                visibleSales.map((sale) => (
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
      </section>
    </section>
  );
}

function recalculateSaleStats(sales: SaleRecord[]): DashboardStat[] {
  const completedSales = sales.filter((sale) => sale.status === "Completed");
  const totalRevenue = completedSales.reduce(
    (sum, sale) => sum + Number(sale.totalAmount),
    0
  );
  const exceptions = sales.filter(
    (sale) => sale.status === "Pending" || sale.status === "Refunded"
  ).length;
  const averageSale = completedSales.length === 0 ? 0 : totalRevenue / completedSales.length;

  return [
    {
      label: "Revenue",
      value: `$${totalRevenue.toFixed(2)}`,
      description: "Completed sales total across the current ledger",
    },
    {
      label: "Transactions",
      value: String(sales.length),
      description: "All recorded checkout events in the current list",
    },
    {
      label: "Average sale",
      value: `$${averageSale.toFixed(2)}`,
      description: "Average value of completed sales",
    },
    {
      label: "Exceptions",
      value: String(exceptions),
      description: "Pending or refunded sales needing review",
    },
  ];
}

export default SalesPage;
