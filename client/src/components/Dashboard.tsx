import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { FiFileText, FiMail } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import { HiOutlineTableCells } from "react-icons/hi2";
import { useOutletContext } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  createUser,
  deleteUser,
  fetchDashboard,
  updateActivity,
  updateUser,
} from "../lib/api";
import type {
  ActivityRecord,
  AdminUserRecord,
  DashboardStat,
  HighlightItem,
} from "../lib/api";
import type { AppRole } from "../types/roles";

type UserStatus = "Active" | "Suspended" | "Pending";
type UserRole = AppRole;

interface RoleOutletContext {
  role: AppRole;
}

const USERS_PER_PAGE = 6;

function Dashboard() {
  const { role } = useOutletContext<RoleOutletContext>();

  if (role === "Admin") {
    return <AdminDashboard />;
  }

  return <RoleDashboard role={role} />;
}

function AdminDashboard() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [stats, setStats] = useState<DashboardStat[]>([]);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "Support" as UserRole,
    status: "Pending" as UserStatus,
    lastActive: "Just invited",
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "All">("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteOptions, setShowInviteOptions] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const actor = user?.name ?? user?.email ?? "System";
  const heroActionsRef = useRef<HTMLDivElement | null>(null);
  const inviteFormRef = useRef<HTMLFormElement | null>(null);
  const inviteNameInputRef = useRef<HTMLInputElement | null>(null);

  const loadDashboard = useCallback(
    async (active = true) => {
      try {
        const data = await fetchDashboard("Admin");
        if (!active) {
          return;
        }

        setUsers(data.users ?? []);
        setActivities(data.activities ?? []);
        setStats(data.stats);
        setError(null);
      } catch {
        if (!active) {
          return;
        }

        setError("Unable to load the admin dashboard right now.");
        showToast("Unable to load the admin dashboard right now.", "error");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    },
    [showToast]
  );

  useEffect(() => {
    let active = true;

    void loadDashboard(active);

    return () => {
      active = false;
    };
  }, [loadDashboard]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (heroActionsRef.current?.contains(target)) {
        return;
      }

      setShowInviteOptions(false);
      setShowExportOptions(false);
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  const visibleUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase()) ||
        user.role.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === "All" || user.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, users]);

  const totalPages = Math.max(1, Math.ceil(visibleUsers.length / USERS_PER_PAGE));

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * USERS_PER_PAGE;
    return visibleUsers.slice(start, start + USERS_PER_PAGE);
  }, [currentPage, visibleUsers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleNewUserChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setNewUser((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await createUser(newUser, actor);
      await loadDashboard();
      setNewUser({
        name: "",
        email: "",
        password: "",
        role: "Support",
        status: "Pending",
        lastActive: "Just invited",
      });
      showToast("User created successfully.", "success");
    } catch {
      showToast("Unable to create user right now.", "error");
    }
  };

  const updateUserStatus = async (id: number, status: UserStatus) => {
    try {
      await updateUser(id, { status }, actor);
      await loadDashboard();
      showToast("User status updated successfully.", "success");
    } catch {
      showToast("Unable to update user status right now.", "error");
    }
  };

  const updateUserRole = async (id: number, role: UserRole) => {
    try {
      await updateUser(id, { role }, actor);
      await loadDashboard();
      showToast("User role updated successfully.", "success");
    } catch {
      showToast("Unable to update user role right now.", "error");
    }
  };

  const removeUser = async (id: number) => {
    try {
      await deleteUser(id, actor);
      await loadDashboard();
      showToast("User deleted successfully.", "info");
    } catch {
      showToast("Unable to delete user right now.", "error");
    }
  };

  const toggleActivityReview = async (id: number, reviewed: boolean) => {
    try {
      const nextActivity = await updateActivity(id, reviewed);
      setActivities((current) =>
        current.map((activity) => (activity.id === id ? nextActivity : activity))
      );
      showToast(
        reviewed ? "Activity marked as reviewed." : "Activity marked as unresolved.",
        "info"
      );
    } catch {
      showToast("Unable to update activity right now.", "error");
    }
  };

  const focusInviteForm = () => {
    setShowExportOptions(false);
    setShowInviteOptions((current) => !current);
  };

  const buildInviteLink = () => {
    const params = new URLSearchParams();
    if (newUser.email) {
      params.set("email", newUser.email);
    }
    if (newUser.role) {
      params.set("role", newUser.role);
    }

    const query = params.toString();
    return `${window.location.origin}/login${query ? `?${query}` : ""}`;
  };

  const shareInvite = (channel: "email" | "whatsapp") => {
    if (!newUser.email || !newUser.role) {
      inviteFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      inviteNameInputRef.current?.focus();
      showToast("Enter at least email and role in the invite form first.", "info");
      return;
    }

    const inviteLink = buildInviteLink();
    const message = `You are invited to Mameron Pharmacy as ${newUser.role}. Sign in here: ${inviteLink}`;

    if (channel === "email") {
      const subject = encodeURIComponent("Mameron Pharmacy access invite");
      const body = encodeURIComponent(`Hello,\n\n${message}\n\nTemporary password: ${newUser.password || "Set by admin separately."}`);
      window.open(`mailto:${encodeURIComponent(newUser.email)}?subject=${subject}&body=${body}`, "_self");
      showToast("Email invite opened.", "success");
    } else {
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      showToast("WhatsApp share opened.", "success");
    }

    setShowInviteOptions(false);
  };

  const exportActivity = () => {
    setShowInviteOptions(false);
    setShowExportOptions((current) => !current);
  };

  const exportActivityCsv = () => {
    const headers = ["Actor", "Area", "Severity", "Action", "Time", "Reviewed"];
    const rows = activities.map((activity) => [
      activity.actor,
      activity.area,
      activity.severity,
      activity.action,
      activity.time,
      activity.reviewed ? "Yes" : "No",
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
    link.download = `activity-log-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    setShowExportOptions(false);
    showToast("Activity log exported successfully.", "success");
  };

  const exportActivityExcel = () => {
    const rows = activities
      .map(
        (activity) => `
          <tr>
            <td>${escapeHtml(activity.actor)}</td>
            <td>${escapeHtml(activity.area)}</td>
            <td>${escapeHtml(activity.severity)}</td>
            <td>${escapeHtml(activity.action)}</td>
            <td>${escapeHtml(activity.time)}</td>
            <td>${activity.reviewed ? "Yes" : "No"}</td>
          </tr>
        `
      )
      .join("");

    const table = `
      <table>
        <thead>
          <tr>
            <th>Actor</th>
            <th>Area</th>
            <th>Severity</th>
            <th>Action</th>
            <th>Time</th>
            <th>Reviewed</th>
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
    link.download = `activity-log-${new Date().toISOString().slice(0, 10)}.xls`;
    link.click();
    window.URL.revokeObjectURL(url);
    setShowExportOptions(false);
    showToast("Activity log exported as Excel.", "success");
  };

  if (loading) {
    return (
      <section className="dashboard-page">
        <section className="panel">Loading dashboard...</section>
      </section>
    );
  }

  if (error) {
    return (
      <section className="dashboard-page">
        <section className="panel">{error}</section>
      </section>
    );
  }

  return (
    <section className="dashboard-page">
      <Hero
        actionsRef={heroActionsRef}
        eyebrow="System Overview"
        title="Admin dashboard for all users and all system activity"
        text="Admins can see every staff account, review high-risk events, and manage access from one central dashboard."
        primaryAction="Invite user"
        secondaryAction="Export activity"
        onPrimaryAction={focusInviteForm}
        onSecondaryAction={exportActivity}
        primaryMenu={
          showInviteOptions ? (
            <div className="hero-action-menu">
              <button
                type="button"
                className="button button--ghost"
                onClick={() => shareInvite("email")}
              >
                <FiMail aria-hidden="true" /> Share by Email
              </button>
              <button
                type="button"
                className="button button--ghost"
                onClick={() => shareInvite("whatsapp")}
              >
                <FaWhatsapp aria-hidden="true" /> Share on WhatsApp
              </button>
            </div>
          ) : null
        }
        secondaryMenu={
          showExportOptions ? (
            <div className="hero-action-menu">
              <button
                type="button"
                className="button button--ghost"
                onClick={exportActivityExcel}
              >
                <HiOutlineTableCells aria-hidden="true" /> Export Excel
              </button>
              <button
                type="button"
                className="button button--ghost"
                onClick={exportActivityCsv}
              >
                <FiFileText aria-hidden="true" /> Export CSV
              </button>
            </div>
          ) : null
        }
      />

      <StatsGrid items={stats} />

      <div className="dashboard-grid">
        <section className="panel panel--wide">
          <div className="panel__header">
            <div>
              <p className="eyebrow">User Management</p>
              <h3>Manage accounts and access levels</h3>
            </div>

            <div className="toolbar">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, email, or role"
                aria-label="Search users"
              />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as UserStatus | "All")}
                aria-label="Filter users by status"
              >
                <option value="All">All statuses</option>
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>
          </div>

          <form ref={inviteFormRef} onSubmit={handleCreateUser} className="toolbar">
            <input
              ref={inviteNameInputRef}
              name="name"
              value={newUser.name}
              onChange={handleNewUserChange}
              placeholder="Full name"
              required
            />
            <input
              name="email"
              type="email"
              value={newUser.email}
              onChange={handleNewUserChange}
              placeholder="Email address"
              required
            />
            <input
              name="password"
              type="password"
              value={newUser.password}
              onChange={handleNewUserChange}
              placeholder="Temporary password"
              required
            />
            <select name="role" value={newUser.role} onChange={handleNewUserChange}>
              <option value="Admin">Admin</option>
              <option value="Pharmacist">Pharmacist</option>
              <option value="Cashier">Cashier</option>
              <option value="Support">Support</option>
            </select>
            <select name="status" value={newUser.status} onChange={handleNewUserChange}>
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
              <option value="Suspended">Suspended</option>
            </select>
            <button type="submit" className="button button--primary">
              Add user
            </button>
          </form>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar">{user.name.slice(0, 2).toUpperCase()}</div>
                        <div>
                          <strong>{user.name}</strong>
                          <p>{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <select
                        value={user.role}
                        onChange={(event) => void updateUserRole(user.id, event.target.value as UserRole)}
                      >
                        <option value="Admin">Admin</option>
                        <option value="Pharmacist">Pharmacist</option>
                        <option value="Cashier">Cashier</option>
                        <option value="Support">Support</option>
                      </select>
                    </td>
                    <td>
                      <span className={`badge badge--${user.status.toLowerCase()}`}>{user.status}</span>
                    </td>
                    <td>{user.lastActive}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="button button--ghost"
                          onClick={() =>
                            void updateUserStatus(
                              user.id,
                              user.status === "Suspended" ? "Active" : "Suspended"
                            )
                          }
                        >
                          {user.status === "Suspended" ? "Activate" : "Suspend"}
                        </button>
                        <button
                          type="button"
                          className="button button--ghost"
                          onClick={() => void updateUserStatus(user.id, "Active")}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="button button--ghost"
                          onClick={() => void removeUser(user.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {visibleUsers.length > 0 ? (
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

        <section className="panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Activity Monitor</p>
              <h3>System audit trail</h3>
            </div>
          </div>

          <div className="activity-list">
            {activities.map((activity) => (
              <article key={activity.id} className="activity-card">
                <div className="activity-card__top">
                  <div>
                    <strong>{activity.actor}</strong>
                    <p>{activity.area}</p>
                  </div>
                  <span className={`badge badge--severity-${activity.severity.toLowerCase()}`}>
                    {activity.severity}
                  </span>
                </div>
                <p className="activity-card__action">{activity.action}</p>
                <div className="activity-card__footer">
                  <span>{activity.time}</span>
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={() => void toggleActivityReview(activity.id, !activity.reviewed)}
                  >
                    {activity.reviewed ? "Mark unresolved" : "Mark reviewed"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function RoleDashboard({ role }: { role: Exclude<AppRole, "Admin"> }) {
  const { showToast } = useToast();
  const [stats, setStats] = useState<DashboardStat[]>([]);
  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      try {
        const data = await fetchDashboard(role);
        if (!active) {
          return;
        }

        setStats(data.stats);
        setHighlights(data.highlights ?? []);
        setError(null);
      } catch {
        if (!active) {
          return;
        }

        setError("Unable to load this dashboard right now.");
        showToast("Unable to load this dashboard right now.", "error");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      active = false;
    };
  }, [role]);

  if (loading) {
    return (
      <section className="dashboard-page">
        <section className="panel">Loading dashboard...</section>
      </section>
    );
  }

  if (error) {
    return (
      <section className="dashboard-page">
        <section className="panel">{error}</section>
      </section>
    );
  }

  if (role === "Pharmacist") {
    return (
      <GenericRoleDashboard
        eyebrow="Medicine Operations"
        title="Pharmacist dashboard focused on stock and prescriptions"
        text="Pharmacists only see their workspace and medicine features, so they can manage stock and prescription queues without admin or cashier tools."
        primaryAction="Review low stock"
        secondaryAction="Open medicines"
        sectionTitle="What pharmacists can do here"
        sectionEyebrow="Daily Focus"
        stats={stats}
        highlights={highlights}
      />
    );
  }

  if (role === "Cashier") {
    return (
      <GenericRoleDashboard
        eyebrow="Sales Operations"
        title="Cashier dashboard for sales and shift performance"
        text="Cashiers only see their dashboard and sales area, keeping billing and payment work separate from medicine or admin controls."
        primaryAction="View shift totals"
        secondaryAction="Open sales"
        sectionTitle="Sales workspace only"
        sectionEyebrow="Cashier Focus"
        stats={stats}
        highlights={highlights}
      />
    );
  }

  return (
    <GenericRoleDashboard
      eyebrow="Order Support"
      title="Support dashboard for customer issues and order handling"
      text="Support staff only see their dashboard and orders area so they can focus on service, handoffs, and issue resolution."
      primaryAction="Review tickets"
      secondaryAction="Open orders"
      sectionTitle="Orders and customer follow-up"
      sectionEyebrow="Support Focus"
      stats={stats}
      highlights={highlights}
    />
  );
}

interface GenericRoleDashboardProps {
  eyebrow: string;
  title: string;
  text: string;
  primaryAction: string;
  secondaryAction: string;
  sectionTitle: string;
  sectionEyebrow: string;
  stats: DashboardStat[];
  highlights: HighlightItem[];
}

function GenericRoleDashboard({
  eyebrow,
  title,
  text,
  primaryAction,
  secondaryAction,
  sectionTitle,
  sectionEyebrow,
  stats,
  highlights,
}: GenericRoleDashboardProps) {
  return (
    <section className="dashboard-page">
      <Hero
        eyebrow={eyebrow}
        title={title}
        text={text}
        primaryAction={primaryAction}
        secondaryAction={secondaryAction}
      />
      <StatsGrid items={stats} />
      <div className="dashboard-grid dashboard-grid--single">
        <section className="panel">
          <p className="eyebrow">{sectionEyebrow}</p>
          <h3>{sectionTitle}</h3>
          <div className="highlight-list">
            {highlights.map((highlight) => (
              <article key={highlight.title} className="highlight-card">
                <strong>{highlight.title}</strong>
                <p>{highlight.text}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

interface HeroProps {
  actionsRef?: React.RefObject<HTMLDivElement | null>;
  eyebrow: string;
  title: string;
  text: string;
  primaryAction: string;
  secondaryAction: string;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  primaryMenu?: ReactNode;
  secondaryMenu?: ReactNode;
}

function Hero({
  actionsRef,
  eyebrow,
  title,
  text,
  primaryAction,
  secondaryAction,
  onPrimaryAction,
  onSecondaryAction,
  primaryMenu,
  secondaryMenu,
}: HeroProps) {
  return (
    <div className="dashboard-hero">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p className="dashboard-hero__text">{text}</p>
      </div>
      <div ref={actionsRef} className="dashboard-hero__actions">
        <div className="hero-action-group">
          <button type="button" className="button button--primary" onClick={onPrimaryAction}>
            {primaryAction}
          </button>
          {primaryMenu}
        </div>
        <div className="hero-action-group">
          <button type="button" className="button button--secondary" onClick={onSecondaryAction}>
            {secondaryAction}
          </button>
          {secondaryMenu}
        </div>
      </div>
    </div>
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

function StatsGrid({ items }: { items: DashboardStat[] }) {
  return (
    <div className="stats-grid">
      {items.map((item) => (
        <article key={item.label} className="stat-card">
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <p>{item.description}</p>
        </article>
      ))}
    </div>
  );
}

export default Dashboard;
