import { useState } from "react";
import { Outlet } from "react-router-dom";

import "./Home.css";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

function Home(){
  const [collapsed, setCollapsed] = useState<boolean>(false);

  const toggleSidebar = (): void => {
    setCollapsed((prev) => !prev);
  };

  return (
    <div className="layout">
      <Sidebar />

      <div className={`main ${collapsed ? "expanded" : ""}`}>
        <Navbar />
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}


export default Home;