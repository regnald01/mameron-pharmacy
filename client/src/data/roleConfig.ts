import type { AppRole } from "../types/roles";

export interface NavItem {
  to: string;
  label: string;
  icon: string;
}

interface RoleMeta {
  title: string;
  accessLabel: string;
  homeLabel: string;
  description: string;
  navItems: NavItem[];
}

export const roleConfig: Record<AppRole, RoleMeta> = {
  Admin: {
    title: "Admin Console",
    accessLabel: "Full access",
    homeLabel: "Admin Dashboard",
    description:
      "Manage all users, review system-wide activity, and oversee pharmacy operations.",
    navItems: [
      { to: "/", label: "Dashboard", icon: "🏠" },
      { to: "/orders", label: "Orders", icon: "📦" },
      { to: "/products", label: "Medicines", icon: "💊" },
      { to: "/sales", label: "Sales", icon: "📈" },
    ],
  },
  Pharmacist: {
    title: "Pharmacist Workspace",
    accessLabel: "Medicine access",
    homeLabel: "Pharmacist Dashboard",
    description:
      "Focus on stock visibility, prescription flow, and medicine operations only.",
    navItems: [
      { to: "/", label: "Dashboard", icon: "🏠" },
      { to: "/products", label: "Medicines", icon: "💊" },
    ],
  },
  Cashier: {
    title: "Cashier Workspace",
    accessLabel: "Sales access",
    homeLabel: "Cashier Dashboard",
    description:
      "Track shift performance, revenue, and payment activity without admin controls.",
    navItems: [
      { to: "/", label: "Dashboard", icon: "🏠" },
      { to: "/sales", label: "Sales", icon: "📈" },
    ],
  },
  Support: {
    title: "Support Workspace",
    accessLabel: "Orders access",
    homeLabel: "Support Dashboard",
    description:
      "Monitor customer issues, order handling, and service response from one place.",
    navItems: [
      { to: "/", label: "Dashboard", icon: "🏠" },
      { to: "/orders", label: "Orders", icon: "📦" },
    ],
  },
};
