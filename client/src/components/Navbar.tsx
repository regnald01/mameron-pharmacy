
interface Props {
  toggleSidebar: () => void;
}

function Navbar({ toggleSidebar }: Props) {
  return (
    <div className="navbar">
      <button onClick={toggleSidebar}>☰</button>
      <h3>Welcome, Admin 👋</h3>
    </div>
  );
}

export default Navbar;