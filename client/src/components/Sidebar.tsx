import { NavLink } from "react-router-dom";

import { roleConfig } from "../data/roleConfig";
import type { AppRole } from "../types/roles";

interface Props {
  collapsed: boolean;
  role: AppRole;
}

function Sidebar({ collapsed, role }: Props) {
  const currentRole = roleConfig[role];

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar__brand">
        <span className="sidebar__logo">Rx</span>
        {!collapsed && (
          <div>
            <strong>Mameron</strong>
            <p>{currentRole.homeLabel}</p>
          </div>
        )}
      </div>

      <nav>
        <ul className="menu">
          {currentRole.navItems.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} end={item.to === "/"}>
                <span className="menu__icon">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {!collapsed && (
        <div className="sidebar__footer">
          <p>{currentRole.description}</p>
        </div>
      )}
    </aside>
  );
}

export default Sidebar;
