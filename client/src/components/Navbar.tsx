import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { roleConfig } from "../data/roleConfig";
import type { AppRole } from "../types/roles";

interface Props {
  role: AppRole;
  toggleSidebar: () => void;
}

const today = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
}).format(new Date());

const roleOwners: Record<AppRole, string> = {
  Admin: "Admin Manager",
  Pharmacist: "Lead Pharmacist",
  Cashier: "Cashier Desk",
  Support: "Support Lead",
};

function Navbar({ role, toggleSidebar }: Props) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const currentRole = roleConfig[role];
  const initials = roleOwners[role]
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = () => {
    logout();
    showToast("Logged out successfully.", "info");
    navigate("/login", { replace: true });
  };

  return (
    <header className="navbar">
      <div className="navbar__left">
        <button
          type="button"
          className="icon-button"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          ☰
        </button>
        <div>
          <p className="eyebrow">{currentRole.title}</p>
          <h1>Mameron Pharmacy</h1>
        </div>
      </div>

      <div className="navbar__right">
        <div className="navbar__meta">
          <span>{user?.email}</span>
          <strong>{today}</strong>
        </div>
        <div className="admin-badge">
          <span className="admin-badge__avatar">{initials}</span>
          <div>
            <strong>{roleOwners[role]}</strong>
            <p>{currentRole.accessLabel}</p>
          </div>
        </div>
        <button type="button" className="button button--ghost" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}

export default Navbar;
