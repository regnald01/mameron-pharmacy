import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

import type { AppRole } from "../types/roles";

type UserStatus = "Active" | "Suspended" | "Pending";
type UserRole = AppRole;
type ActivitySeverity = "High" | "Medium" | "Low";

interface UserRecord {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastActive: string;
}

interface ActivityRecord {
  id: number;
  actor: string;
  action: string;
  area: string;
  severity: ActivitySeverity;
  time: string;
  reviewed: boolean;
}

interface RoleOutletContext {
  role: AppRole;
}

const initialUsers: UserRecord[] = [
  { id: 1, name: "Alice Mboya", email: "alice@mameron.local", role: "Admin", status: "Active", lastActive: "2 minutes ago" },
  { id: 2, name: "Brian Kato", email: "brian@mameron.local", role: "Pharmacist", status: "Active", lastActive: "14 minutes ago" },
  { id: 3, name: "Chantal Amina", email: "chantal@mameron.local", role: "Cashier", status: "Pending", lastActive: "Today, 09:12" },
  { id: 4, name: "David Ouma", email: "david@mameron.local", role: "Support", status: "Suspended", lastActive: "Yesterday, 16:48" },
];

const initialActivities: ActivityRecord[] = [
  { id: 101, actor: "Alice Mboya", action: "Changed user permissions for Brian Kato", area: "Access Control", severity: "High", time: "5 minutes ago", reviewed: false },
  { id: 102, actor: "Brian Kato", action: "Approved 14 pending prescriptions", area: "Orders", severity: "Medium", time: "18 minutes ago", reviewed: true },
  { id: 103, actor: "System", action: "Nightly backup completed successfully", area: "Infrastructure", severity: "Low", time: "01:00 AM", reviewed: true },
  { id: 104, actor: "Security Watcher", action: "Blocked suspicious login attempt from new device", area: "Authentication", severity: "High", time: "Yesterday, 11:24 PM", reviewed: false },
];

function Dashboard() {
  const { role } = useOutletContext<RoleOutletContext>();

  if (role === "Admin") {
    return <AdminDashboard />;
  }

  if (role === "Pharmacist") {
    return <PharmacistDashboard />;
  }

  if (role === "Cashier") {
    return <CashierDashboard />;
  }

  return <SupportDashboard />;
}

function AdminDashboard() {
  const [users, setUsers] = useState(initialUsers);
  const [activities, setActivities] = useState(initialActivities);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "All">("All");

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

  const unresolvedActivities = activities.filter((activity) => !activity.reviewed).length;
  const activeUsers = users.filter((user) => user.status === "Active").length;
  const pendingUsers = users.filter((user) => user.status === "Pending").length;

  const updateUserStatus = (id: number, status: UserStatus) => {
    setUsers((current) =>
      current.map((user) => (user.id === id ? { ...user, status } : user))
    );
  };

  const updateUserRole = (id: number, role: UserRole) => {
    setUsers((current) =>
      current.map((user) => (user.id === id ? { ...user, role } : user))
    );
  };

  const toggleActivityReview = (id: number) => {
    setActivities((current) =>
      current.map((activity) =>
        activity.id === id
          ? { ...activity, reviewed: !activity.reviewed }
          : activity
      )
    );
  };

  return (
    <section className="dashboard-page">
      <Hero
        eyebrow="System Overview"
        title="Admin dashboard for all users and all system activity"
        text="Admins can see every staff account, review high-risk events, and manage access from one central dashboard."
        primaryAction="Invite user"
        secondaryAction="Export activity"
      />

      <StatsGrid
        items={[
          { label: "Total users", value: String(users.length), description: `${activeUsers} currently active in the workspace` },
          { label: "Pending approvals", value: String(pendingUsers), description: "Accounts waiting for activation or review" },
          { label: "Open alerts", value: String(unresolvedActivities), description: "Activity items still waiting for an admin check" },
          { label: "Audit coverage", value: "98%", description: "Recent system actions captured in the log feed" },
        ]}
      />

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
                        onChange={(event) => updateUserRole(user.id, event.target.value as UserRole)}
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
                            updateUserStatus(
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
                          onClick={() => updateUserStatus(user.id, "Active")}
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
                    onClick={() => toggleActivityReview(activity.id)}
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

function PharmacistDashboard() {
  return (
    <section className="dashboard-page">
      <Hero
        eyebrow="Medicine Operations"
        title="Pharmacist dashboard focused on stock and prescriptions"
        text="Pharmacists only see their workspace and medicine features, so they can manage stock and prescription queues without admin or cashier tools."
        primaryAction="Review low stock"
        secondaryAction="Open medicines"
      />
      <StatsGrid
        items={[
          { label: "Prescriptions queue", value: "18", description: "Items waiting for pharmacist review" },
          { label: "Low stock medicines", value: "7", description: "Products that need restocking soon" },
          { label: "Expiring this month", value: "4", description: "Medicines needing priority rotation" },
          { label: "Today's approvals", value: "26", description: "Prescriptions approved by your team" },
        ]}
      />
      <div className="dashboard-grid dashboard-grid--single">
        <section className="panel">
          <p className="eyebrow">Daily Focus</p>
          <h3>What pharmacists can do here</h3>
          <div className="highlight-list">
            <article className="highlight-card">
              <strong>Monitor medicine availability</strong>
              <p>Check low stock, expiring products, and item movement before shortages affect patients.</p>
            </article>
            <article className="highlight-card">
              <strong>Prepare prescription workflows</strong>
              <p>See pending approvals, refill requests, and pharmacist-owned actions from one dashboard.</p>
            </article>
          </div>
        </section>
      </div>
    </section>
  );
}

function CashierDashboard() {
  return (
    <section className="dashboard-page">
      <Hero
        eyebrow="Sales Operations"
        title="Cashier dashboard for sales and shift performance"
        text="Cashiers only see their dashboard and sales area, keeping billing and payment work separate from medicine or admin controls."
        primaryAction="View shift totals"
        secondaryAction="Open sales"
      />
      <StatsGrid
        items={[
          { label: "Today's sales", value: "$4,820", description: "Revenue processed in the current shift cycle" },
          { label: "Transactions", value: "126", description: "Completed payments across all desks today" },
          { label: "Average basket", value: "$38", description: "Average customer purchase amount" },
          { label: "Refund requests", value: "3", description: "Cases waiting for review or approval" },
        ]}
      />
      <div className="dashboard-grid dashboard-grid--single">
        <section className="panel">
          <p className="eyebrow">Cashier Focus</p>
          <h3>Sales workspace only</h3>
          <div className="highlight-list">
            <article className="highlight-card">
              <strong>Track live revenue</strong>
              <p>Keep an eye on totals, completed transactions, and payment flow throughout the day.</p>
            </article>
            <article className="highlight-card">
              <strong>Handle desk exceptions</strong>
              <p>Follow up on refunds, payment issues, and shift reconciliation without touching admin settings.</p>
            </article>
          </div>
        </section>
      </div>
    </section>
  );
}

function SupportDashboard() {
  return (
    <section className="dashboard-page">
      <Hero
        eyebrow="Order Support"
        title="Support dashboard for customer issues and order handling"
        text="Support staff only see their dashboard and orders area so they can focus on service, handoffs, and issue resolution."
        primaryAction="Review tickets"
        secondaryAction="Open orders"
      />
      <StatsGrid
        items={[
          { label: "Open order issues", value: "11", description: "Cases currently waiting for follow-up" },
          { label: "Late deliveries", value: "5", description: "Orders that need customer communication" },
          { label: "Resolved today", value: "23", description: "Support cases closed by the team" },
          { label: "Response time", value: "12m", description: "Average first-response speed this morning" },
        ]}
      />
      <div className="dashboard-grid dashboard-grid--single">
        <section className="panel">
          <p className="eyebrow">Support Focus</p>
          <h3>Orders and customer follow-up</h3>
          <div className="highlight-list">
            <article className="highlight-card">
              <strong>Resolve order blockers</strong>
              <p>Follow delayed orders, incomplete prescriptions, and delivery questions from one service queue.</p>
            </article>
            <article className="highlight-card">
              <strong>Keep customers updated</strong>
              <p>Use the support dashboard to prioritize urgent requests and close the communication loop faster.</p>
            </article>
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

interface StatsGridProps {
  items: Array<{
    label: string;
    value: string;
    description: string;
  }>;
}

function StatsGrid({ items }: StatsGridProps) {
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
