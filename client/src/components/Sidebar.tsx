import { NavLink } from "react-router-dom";

interface Props {
  collapsed: boolean;
}

function Sidebar({ collapsed }: Props) {
  return (
    <div className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <h2>💊 {!collapsed && "Pharmacy"}</h2>

      <ul className="menu">
        <li>
          <NavLink to="/" end>
            🏠 {!collapsed && "Dashboard"}
          </NavLink>
        </li>

        <li>
          <NavLink to="/orders">
            📦 {!collapsed && "Orders"}
          </NavLink>
        </li>

        <li>
          <NavLink to="/products">
            💊 {!collapsed && "Products"}
          </NavLink>
        </li>

        <li>
          <NavLink to="/sales">
            💰 {!collapsed && "Sales"}
          </NavLink>
        </li>
      </ul>
    </div>
  );
}

export default Sidebar;