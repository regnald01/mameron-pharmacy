import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import type { AppRole } from "../types/roles";
import "./Login.css";

function Login() {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>("Admin");

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    login({ email, password, role });
    navigate("/", { replace: true });
  };

  return (
    <div className="login-page">
      <section className="login-card">
        <aside className="login-copy">
          <div className="login-brand">
            <span className="login-brand__badge">Rx</span>
            <div>
              <strong>Mameron Pharmacy</strong>
              <p className="login-brand__tag">Pharmacy management system</p>
            </div>
          </div>
          <p className="eyebrow">Secure Access</p>
          <div className="login-copy__highlights">
            <span>Admin sees full system control</span>
            <span>Pharmacist sees dashboard and medicines</span>
            <span>Cashier sees dashboard and sales</span>
            <span>Support sees dashboard and orders</span>
          </div>
        </aside>

        <form className="login-form" onSubmit={handleSubmit}>
           <h3>Welcome,Login Page </h3>
          <label>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@mameron.local"
              required
            />
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
            />
          </label>

          <label>
            <span>Login as</span>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as AppRole)}
            >
              <option value="Admin">Admin</option>
              <option value="Pharmacist">Pharmacist</option>
              <option value="Cashier">Cashier</option>
              <option value="Support">Support</option>
            </select>
          </label>

          <button type="submit" className="login-button">
            Continue to dashboard
          </button>
        </form>
      </section>
    </div>
  );
}

export default Login;
