
function Dashboard() {
  return (
    <div>
      <h2 style={{ marginBottom: "20px" }}>Overview</h2>

      <div style={{ display: "flex", gap: "20px" }}>
        <div style={cardStyle}>
          <h4>Total Sales</h4>
          <p>$12,430</p>
        </div>

        <div style={cardStyle}>
          <h4>Total Orders</h4>
          <p>320</p>
        </div>

        <div style={cardStyle}>
          <h4>Products</h4>
          <p>58</p>
        </div>
      </div>
    </div>
  );
}

const cardStyle = {
  background: "white",
  padding: "20px",
  borderRadius: "12px",
  flex: 1,
  boxShadow: "0 4px 10px rgba(0,0,0,0.05)"
};



export default Dashboard;
