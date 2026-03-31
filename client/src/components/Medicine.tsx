import { useState } from "react";
import type { ChangeEvent, CSSProperties, FormEvent } from "react";

interface Medicine {
  name: string;
  purchasePrice: string;
  sellingPrice: string;
  quantity: string;
  expiryDate: string;
}

function Medicines() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [form, setForm] = useState<Medicine>({
    name: "",
    purchasePrice: "",
    sellingPrice: "",
    quantity: "",
    expiryDate: "",
  });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (editingIndex !== null) {
      const updated = [...medicines];
      updated[editingIndex] = form;
      setMedicines(updated);
      setEditingIndex(null);
    } else {
      setMedicines([...medicines, form]);
    }

    setForm({
      name: "",
      purchasePrice: "",
      sellingPrice: "",
      quantity: "",
      expiryDate: "",
    });
  };

  const handleEdit = (index: number) => {
    setForm(medicines[index]);
    setEditingIndex(index);
  };

  const handleDelete = (index: number) => {
    setMedicines((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <section className="panel panel--wide">
      <p className="eyebrow">Inventory Control</p>
      <h2>Medicine management</h2>

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
          {editingIndex !== null ? "Update medicine" : "Add medicine"}
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
            {medicines.length === 0 ? (
              <tr>
                <td colSpan={6}>No medicines added yet.</td>
              </tr>
            ) : (
              medicines.map((medicine, index) => (
                <tr key={`${medicine.name}-${index}`}>
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
                        onClick={() => handleEdit(index)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="button button--ghost"
                        onClick={() => handleDelete(index)}
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
