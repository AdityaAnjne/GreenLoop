import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// Theme
import { ThemeProvider } from "./context/ThemeContext";
import "./styles/theme.css";

// SECURITY: Import role utilities
import { isAdminRole, isValidFrontendRole } from "./constants/roles";

// Components
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

// Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import AIQualityCheck from "./pages/AIQualityCheck";

import ProductsPage from "./pages/farmer-dashboard/ProductsPage";
import AddProductPage from "./pages/farmer-dashboard/AddProductPage";
import {
  getFarmerProducts,
  updateProductInBackend,
} from "./pages/api";
import DistributorDashboard from "./pages/DistributorDashboard";
import RetailerDashboard from "./pages/RetailerDashboard";
import CustomerDashboard from "./pages/CustomerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ProductDetail from "./pages/ProductDetail";
import Unauthorized from "./pages/Unauthorized";
import EditProductPage from "./pages/farmer-dashboard/EditProductPage";
import PrivateRoute from "./components/PrivateRoute";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";

function App() {
  const [products, setProducts] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "null");
    // SECURITY: Validate user role from storage (should come from JWT)
    if (userData && userData.role) {
      if (!isValidFrontendRole(userData.role) && !isAdminRole(userData.role)) {
        console.warn(`Invalid role stored: ${userData.role}, clearing user`);
        localStorage.removeItem("user");
        setUser(null);
      } else {
        setUser(userData);
      }
    }
  }, []);

  // Fetch this farmer's products from the backend once we know who's logged in
  useEffect(() => {
    if (!user || user.role?.toLowerCase() !== "farmer") return;

    const fetchProducts = async () => {
      try {
        const backendProducts = await getFarmerProducts();
        setProducts(backendProducts);
      } catch (err) {
        console.error("Failed to fetch products from backend:", err);
        setProducts([]);
      }
    };

    fetchProducts();
  }, [user]);

  const addProduct = (newProduct) => {
    // Products now live in the backend (MySQL), not localStorage.
    // This just keeps the in-memory list in sync for an instant UI update;
    // the next dashboard load will re-fetch the authoritative list anyway.
    setProducts((prev) => [...prev, newProduct]);
  };

  const deleteProduct = (productId) => {
    // The actual backend DELETE call already happened in ProductsPage.js's
    // handleDeleteProduct before this is invoked. This just syncs local state
    // afterward - it must NOT call the backend again, or it will 404 since
    // the product is already gone.
    setProducts((prev) => prev.filter((product) => product.id !== productId));
  };

  const updateProduct = async (productId, productData) => {
    const savedProduct = await updateProductInBackend(productId, productData);
    setProducts((prev) =>
      prev.map((product) => (product.id === productId ? savedProduct : product)),
    );
    return savedProduct;
  };

  return (
    <ThemeProvider>
      <Router>
        <Navbar user={user} setUser={setUser} />
        <div style={{ paddingTop: "64px" }}>
          <Routes>
            {/* Default Route → Redirect to Login */}
            <Route path="/" element={<Navigate to="/login" />} />
            {/* Public Routes */}
            <Route path="/login" element={<Login setUser={setUser} />} />
            <Route path="/register" element={<Register setUser={setUser} />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/unauthorized" element={<Unauthorized />} />{" "}
            <Route
              path="/ai-quality-check"
              element={
                <PrivateRoute allowedRoles={["customer"]}>
                  <AIQualityCheck />
                </PrivateRoute>
              }
            />{" "}
            <Route
              path="/edit-product/:id"
              element={
                <PrivateRoute allowedRoles={["farmer"]}>
                  <EditProductPage
                    products={products}
                    onUpdateProduct={updateProduct}
                  />
                </PrivateRoute>
              }
            />
            {/* Protected Routes */}
            <Route
              path="/farmer-dashboard"
              element={
                <PrivateRoute allowedRoles={["farmer"]}>
                  <ProductsPage
                    products={products}
                    onDeleteProduct={deleteProduct}
                  />
                </PrivateRoute>
              }
            />
            <Route
              path="/add-product"
              element={
                <PrivateRoute allowedRoles={["farmer"]}>
                  <AddProductPage addProduct={addProduct} />
                </PrivateRoute>
              }
            />
            <Route
              path="/distributor-dashboard"
              element={
                <PrivateRoute allowedRoles={["distributor"]}>
                  <DistributorDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/retailer-dashboard"
              element={
                <PrivateRoute allowedRoles={["retailer"]}>
                  <RetailerDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/customer-dashboard"
              element={
                <PrivateRoute allowedRoles={["customer"]}>
                  <CustomerDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin-dashboard"
              element={
                <PrivateRoute user={user} allowedRoles={["admin"]}>
                  <AdminDashboard />
                </PrivateRoute>
              }
            />
            {/* SECURITY: Admin route protection - new standardized path */}
            <Route
              path="/admin/dashboard"
              element={
                <PrivateRoute user={user} allowedRoles={["admin"]}>
                  <AdminDashboard />
                </PrivateRoute>
              }
            />
            {/* Catch-all route */}
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        </div>
        <Footer />
      </Router>
    </ThemeProvider>
  );
}

export default App;