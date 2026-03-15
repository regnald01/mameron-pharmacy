import { useState } from "react";

function Navbar() {
 
  const  [toggleSidebar,setToggleSidebar]= useState(false);
  return (
    <div className="navbar">
      <button className="menu-btn">
                ☰
      </button>

      <div>Welcome, Admin 👋</div>
    </div>
  );
}

export default Navbar;
