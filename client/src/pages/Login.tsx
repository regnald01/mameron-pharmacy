import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { ApiError } from "../lib/api";
import type { AppRole } from "../types/roles";
import "./Login.css";

function Login() {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>("Admin");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      await login({ email, password, role });
      showToast("Signed in successfully.", "success");
      navigate("/", { replace: true });
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Unable to sign in right now.";
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
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
            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path
                      d="M3 3l18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 5.1A10.9 10.9 0 0 1 12 5c5 0 9.3 3.1 11 7-1 2.2-2.8 4.1-5 5.3M6.7 6.7C4.6 8 2.9 9.8 2 12c1.7 3.9 6 7 10 7 1 0 1.9-.1 2.8-.4M14.1 14.1A3 3 0 0 1 9.9 9.9"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path
                      d="M2 12c1.7-3.9 6-7 10-7s8.3 3.1 10 7c-1.7 3.9-6 7-10 7S3.7 15.9 2 12Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                  </svg>
                )}
              </button>
            </div>
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

          <button type="submit" className="login-button" disabled={submitting}>
            {submitting ? "Signing in..." : "Continue to dashboard"}
          </button>
        </form>
      </section>
    </div>
  );
}

export default Login;
