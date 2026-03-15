import { Link } from "react-router-dom";
import { useState } from "react";
function Sidebar() {
  const  [collapsed,setCollapsed] = useState(false);
  return (
    <div className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <h2>{collapsed ? "PA" : "Pharmacy Admin"}</h2>

      <Link to="/">🏠 {!collapsed && "Dashboard"}</Link>
      <Link to="/orders">📦 {!collapsed && "Orders"}</Link>
      <Link to="/products">💊 {!collapsed && "Products"}</Link>
       <Link to="/Sales"> {!collapsed && "Sales"}</Link>
    </div>
  );
}

export default Sidebar;
