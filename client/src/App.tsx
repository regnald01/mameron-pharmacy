import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Dashboard from "./components/Dashboard";
import Medicines from "./components/Medicine";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import ManagementPage from "./pages/ManagementPage";
import StockPage from "./pages/StockPage";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route
              path="orders"
              element={
                <ManagementPage
                  title="Order Center"
                  description="Track prescription requests, refill approvals, and delivery progress from the support and admin workspace."
                />
              }
            />
            <Route path="products" element={<Medicines />} />
            <Route path="stock" element={<StockPage />} />
            <Route
              path="sales"
              element={
                <ManagementPage
                  title="Sales Analytics"
                  description="Review revenue trends, peak hours, and payment activity from the cashier and admin workspace."
                />
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
