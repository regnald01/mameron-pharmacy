
import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

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
    expiryDate: ""
  });

  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

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
      expiryDate: ""
    });
  };

  const handleEdit = (index: number) => {
    setForm(medicines[index]);
    setEditingIndex(index);
  };

  const handleDelete = (index: number) => {
    const filtered = medicines.filter((_, i) => i !== index);
    setMedicines(filtered);
  };

  return (
    <div>
      <h2 style={{ marginBottom: "20px" }}>Medicine Management</h2>

      {/* FORM */}
      <form onSubmit={handleSubmit} style={formStyle}>
        <input
          name="name"
          placeholder="Medicine Name"
          value={form.name}
          onChange={handleChange}
          required
        />

        <input
          name="purchasePrice"
          type="number"
          placeholder="Purchase Price"
          value={form.purchasePrice}
          onChange={handleChange}
          required
        />

        <input
          name="sellingPrice"
          type="number"
          placeholder="Selling Price"
          value={form.sellingPrice}
          onChange={handleChange}
          required
        />

        <input
          name="quantity"
          type="number"
          placeholder="Quantity"
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

        <button type="submit">
          {editingIndex !== null ? "Update Medicine" : "Add Medicine"}
        </button>
      </form>

      {/* TABLE */}
      <table style={tableStyle}>
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
          {medicines.map((med, index) => (
            <tr key={index}>
              <td>{med.name}</td>
              <td>{med.purchasePrice}</td>
              <td>{med.sellingPrice}</td>
              <td>{med.quantity}</td>
              <td style={{ color: isExpired(med.expiryDate) ? "red" : "black" }}>
                {med.expiryDate}
              </td>
              <td>
                <button onClick={() => handleEdit(index)}>Edit</button>
                <button onClick={() => handleDelete(index)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* Expiry check */
function isExpired(date: string): boolean {
  return new Date(date) < new Date();
}

/* Styles */
const formStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "10px",
  marginBottom: "20px"
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  background: "white",
  borderRadius: "10px",
  overflow: "hidden"
};

export default Medicines;