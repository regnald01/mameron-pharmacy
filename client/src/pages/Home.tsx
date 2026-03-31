import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import { roleConfig } from "../data/roleConfig";
import "./Home.css";

function Home() {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const toggleSidebar = () => {
    setCollapsed((prev) => !prev);
  };

  useEffect(() => {
    if (!user) {
      return;
    }

    const allowedPaths = roleConfig[user.role].navItems.map((item) => item.to);

    if (!allowedPaths.includes(location.pathname)) {
      navigate("/", { replace: true });
    }
  }, [location.pathname, navigate, user]);

  if (!user) {
    return null;
  }

  return (
    <div className="layout">
      <Sidebar collapsed={collapsed} role={user.role} />

      <div className={`main ${collapsed ? "expanded" : ""}`}>
        <Navbar role={user.role} toggleSidebar={toggleSidebar} />
        <main className="content">
          <Outlet context={{ role: user.role }} />
        </main>
      </div>
    </div>
  );
}

export default Home;
