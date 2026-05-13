import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Dashboard from "./components/Dashboard";
import Medicines from "./components/Medicine";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import Home from "./pages/Home";
import ItemsPage from "./pages/ItemsPage";
import Login from "./pages/Login";
import OrdersPage from "./pages/OrdersPage";
import SalesPage from "./pages/SalesPage";
import StockPage from "./pages/StockPage";

function App() {
  return (
    <ToastProvider>
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
                element={<OrdersPage />}
              />
              <Route path="items" element={<ItemsPage />} />
              <Route path="products" element={<Medicines />} />
              <Route path="stock" element={<StockPage />} />
              <Route path="sales" element={<SalesPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
