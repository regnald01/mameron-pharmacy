import { useEffect, useMemo, useState } from "react";

import { fetchMedicines } from "../lib/api";
import type { MedicineRecord } from "../lib/api";

function StockPage() {
  const [medicines, setMedicines] = useState<MedicineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        <div className="dashboard-hero__actions">
          <button type="button" className="button button--primary">
            Stock report
          </button>
          <button type="button" className="button button--secondary">
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
              {medicines.length === 0 ? (
                <tr>
                  <td colSpan={5}>No stock data available yet.</td>
                </tr>
              ) : (
                medicines.map((medicine) => {
                  const quantity = Number(medicine.quantity);
                  const stockLabel =
                    quantity <= 20 ? "Critical" : quantity <= 50 ? "Low" : "Healthy";

                  return (
                    <tr key={medicine.id}>
                      <td>{medicine.name}</td>
                      <td>{medicine.quantity}</td>
                      <td>
                        <span className={`badge badge--${stockLabel.toLowerCase()}`}>
                          {stockLabel}
                        </span>
                      </td>
                      <td>{medicine.expiryDate}</td>
                      <td>{medicine.sellingPrice}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
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

export default StockPage;
