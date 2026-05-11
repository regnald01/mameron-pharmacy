import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

import {
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

function Dashboard() {
  const { role } = useOutletContext<RoleOutletContext>();

  if (role === "Admin") {
    return <AdminDashboard />;
  }

  return <RoleDashboard role={role} />;
}

function AdminDashboard() {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [stats, setStats] = useState<DashboardStat[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "All">("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
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

  const updateUserStatus = async (id: number, status: UserStatus) => {
    const nextUser = await updateUser(id, { status });
    setUsers((current) => current.map((user) => (user.id === id ? nextUser : user)));
  };

  const updateUserRole = async (id: number, role: UserRole) => {
    const nextUser = await updateUser(id, { role });
    setUsers((current) => current.map((user) => (user.id === id ? nextUser : user)));
  };

  const toggleActivityReview = async (id: number, reviewed: boolean) => {
    const nextActivity = await updateActivity(id, reviewed);
    setActivities((current) =>
      current.map((activity) => (activity.id === id ? nextActivity : activity))
    );
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
        eyebrow="System Overview"
        title="Admin dashboard for all users and all system activity"
        text="Admins can see every staff account, review high-risk events, and manage access from one central dashboard."
        primaryAction="Invite user"
        secondaryAction="Export activity"
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
                {visibleUsers.map((user) => (
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
  eyebrow: string;
  title: string;
  text: string;
  primaryAction: string;
  secondaryAction: string;
}

function Hero({ eyebrow, title, text, primaryAction, secondaryAction }: HeroProps) {
  return (
    <div className="dashboard-hero">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p className="dashboard-hero__text">{text}</p>
      </div>
      <div className="dashboard-hero__actions">
        <button type="button" className="button button--primary">
          {primaryAction}
        </button>
        <button type="button" className="button button--secondary">
          {secondaryAction}
        </button>
      </div>
    </div>
  );
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
