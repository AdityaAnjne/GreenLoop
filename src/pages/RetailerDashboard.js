import React, { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { Truck, AlertCircle, BarChart3 } from "lucide-react";
import { getRetailerInventory, getAllProducts, getAvailableDistributors } from "./api";
import axiosInstance from "../api/axiosInstance";
import "../styles/RetailerDashboard.css";

const RetailerDashboard = () => {
  const { isDark } = useTheme();

  // State for products from backend
  const [availableProducts, setAvailableProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retailerInfo, setRetailerInfo] = useState(null);

  const [orderHistory, setOrderHistory] = useState([]);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [activeTab, setActiveTab] = useState("inventory");

  // NEW: Retailer's distributor network
  const [myDistributors, setMyDistributors] = useState([]);
  const [distributorsLoading, setDistributorsLoading] = useState(true);

  // Per-order distributor selection — dropdown shows directly, no "Confirm" reveal step.
  // Keyed by orderId so multiple PLACED orders don't share one selection.
  const [distributorSelections, setDistributorSelections] = useState({});
  const [confirmSubmitting, setConfirmSubmitting] = useState(null); // holds orderId currently submitting, or null

  // Fetch retailer inventory and all products
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        // Get retailer's assigned products
        const retailerData = await getRetailerInventory();
        setRetailerInfo({
          id: retailerData.retailerId,
          name: retailerData.retailerName,
        });

        // Map backend products to display format
        const mappedProducts = retailerData.products.map((product) => ({
          id: product.id,
          name: product.cropType,
          price: product.price ?? 0,
          supplier: `Farmer ID: ${product.farmerId}`,
          stock: product.quantity ?? 0,
          image: product.imageUrl || null,
          ...product, // Include all backend fields
        }));

        setAvailableProducts(mappedProducts);
      } catch (err) {
        console.error("Failed to fetch products:", err);
        // Fallback to mock data if backend is unavailable
        setError(err.message);
        setAvailableProducts([
          {
            id: 1,
            name: "Organic Tomatoes",
            price: 2.5,
            supplier: "Green Fields Farm",
            stock: 120,
            image: "🍅",
          },
          {
            id: 2,
            name: "Bell Peppers",
            price: 3.0,
            supplier: "Sunshine Acres",
            stock: 85,
            image: "🫑",
          },
          {
            id: 3,
            name: "Carrots",
            price: 1.8,
            supplier: "Riverbend Farm",
            stock: 60,
            image: "🥕",
          },
          {
            id: 4,
            name: "Banana",
            price: 2.8,
            supplier: "Riverbend Farm",
            stock: 150,
            image: "🍌",
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Load every distributor account — retailer assigns an order to any of them
  useEffect(() => {
    const loadDistributors = async () => {
      setDistributorsLoading(true);
      try {
        const distributors = await getAvailableDistributors();
        setMyDistributors(distributors);
      } catch (err) {
        console.error("Failed to load distributors:", err);
        setMyDistributors([]);
      } finally {
        setDistributorsLoading(false);
      }
    };

    loadDistributors();
  }, []);

  // Fetch retailer orders from backend
  const fetchRetailerOrders = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setOrderHistory([]);
        return;
      }

      const response = await axiosInstance.get("/api/orders/retailer", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setOrderHistory(response.data || []);
    } catch (error) {
      console.error("Failed to fetch retailer orders:", error);
      setOrderHistory([]);
    }
  };

  useEffect(() => {
    fetchRetailerOrders();
  }, []);

  // Confirm a pending order (PLACED -> CONFIRMED). Distributor is chosen directly
  // from the dropdown shown inline — no separate "Confirm" reveal step first.
  const handleConfirmOrder = async (orderId) => {
    const distributorId = distributorSelections[orderId];
    if (!distributorId) {
      alert("Please choose a distributor before confirming.");
      return;
    }

    setConfirmSubmitting(orderId);
    try {
      // Always read a fresh token right before the call, and stop cleanly
      // (instead of silently proceeding) if it's missing — an expired/missing
      // token is what produces the bare 403 with no response body.
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Your session has expired. Please log out and log back in.");
        setConfirmSubmitting(null);
        return;
      }

      await axiosInstance.put(
        `/api/orders/${orderId}/confirm`,
        { distributorId: Number(distributorId) },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      // Clear this order's selection and refresh the list after confirming
      setDistributorSelections((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
      fetchRetailerOrders();
    } catch (error) {
      const status = error.response?.status;
      const message =
        error.response?.data?.message ||
        (status === 403
          ? "Your session has expired or is invalid. Please log out and log back in."
          : error.message || "Failed to confirm order");
      alert(message);
    } finally {
      setConfirmSubmitting(null);
    }
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${
        isDark
          ? "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white"
          : "bg-gradient-to-br from-emerald-50 via-white to-green-50"
      }`}
    >
      {/* Header */}
      <header
        className={`backdrop-blur-xl sticky top-0 z-40 transition-colors duration-200 ${
          isDark
            ? "bg-slate-800/80 border-b border-slate-700"
            : "bg-white/80 border-b border-white/50"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div>
            {/* Removed emoji/icon to show plain heading text only */}
            <h1
              className={`text-3xl font-bold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Retailer Dashboard
            </h1>
            <p
              className={`mt-1 ${isDark ? "text-slate-300" : "text-gray-600"}`}
            >
              Manage inventory and orders from distributors
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Tabs */}
        <div
          className={`flex gap-4 mb-8 border-b ${
            isDark ? "border-slate-700" : "border-gray-200"
          }`}
        >
          {[
            { id: "inventory", label: "Inventory" },
            { id: "orders", label: "Orders", badge: orderHistory.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-semibold transition-all border-b-2 relative ${
                activeTab === tab.id
                  ? "text-emerald-600 border-emerald-600"
                  : isDark
                    ? "text-slate-400 border-transparent hover:text-slate-300"
                    : "text-gray-600 border-transparent hover:text-gray-900"
              }`}
            >
              {tab.label}
              {tab.badge > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Inventory Tab */}
        {activeTab === "inventory" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {availableProducts.map((product) => (
              <div
                key={product.id}
                className={`backdrop-blur-xl rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition ${
                  isDark
                    ? "bg-slate-800/50 border border-slate-700"
                    : "bg-white/80 border border-white/50"
                }`}
              >
                {/* Product Image */}
                <div className="h-32 bg-gradient-to-br from-emerald-200 to-green-300 flex items-center justify-center text-5xl overflow-hidden">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.parentElement.textContent = "📦";
                      }}
                    />
                  ) : (
                    "📦"
                  )}
                </div>

                {/* Product Info */}
                <div className="p-6">
                  <h3
                    className={`text-lg font-bold mb-2 ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {product.name}
                  </h3>
                  <p
                    className={`text-sm mb-4 ${
                      isDark ? "text-slate-300" : "text-gray-600"
                    }`}
                  >
                    {product.supplier}
                  </p>

                  {/* Stock Level */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-sm font-semibold ${
                          isDark ? "text-slate-300" : "text-gray-700"
                        }`}
                      >
                        Stock
                      </span>
                      <span
                        className={`text-sm font-bold ${
                          product.stock > 50
                            ? "text-green-600"
                            : "text-orange-600"
                        }`}
                      >
                        {product.stock} kg
                      </span>
                    </div>
                    <div
                      className={`w-full h-2 rounded-full overflow-hidden ${
                        isDark ? "bg-slate-700" : "bg-gray-200"
                      }`}
                    >
                      <div
                        className={`h-full transition-all ${
                          product.stock > 50
                            ? "bg-gradient-to-r from-green-400 to-emerald-600"
                            : "bg-gradient-to-r from-orange-400 to-red-600"
                        }`}
                        style={{
                          width: `${Math.min(product.stock / 2, 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Price */}
                  <div>
                    <p className="text-2xl font-bold text-emerald-600">
                      ₹{(product.price ?? 0).toFixed(2)}/kg
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <div
            className={`backdrop-blur-xl rounded-2xl overflow-hidden shadow-lg ${
              isDark
                ? "bg-slate-800/50 border border-slate-700"
                : "bg-white/80 border border-white/50"
            }`}
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr
                    className={`border-b ${
                      isDark
                        ? "border-slate-700 bg-slate-700/30"
                        : "border-gray-200 bg-gray-50/50"
                    }`}
                  >
                    <th
                      className={`px-6 py-4 text-left text-sm font-semibold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Order ID
                    </th>
                    <th
                      className={`px-6 py-4 text-left text-sm font-semibold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Items
                    </th>
                    <th
                      className={`px-6 py-4 text-left text-sm font-semibold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Total
                    </th>
                    <th
                      className={`px-6 py-4 text-left text-sm font-semibold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Date
                    </th>
                    <th
                      className={`px-6 py-4 text-left text-sm font-semibold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Status
                    </th>
                    <th
                      className={`px-6 py-4 text-left text-sm font-semibold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orderHistory.length === 0 ? (
                    <tr>
                      <td
                        colSpan="6"
                        className={`px-6 py-8 text-center ${
                          isDark ? "text-slate-400" : "text-gray-500"
                        }`}
                      >
                        <div className="flex flex-col items-center">
                          <AlertCircle
                            size={40}
                            className={`mb-2 ${
                              isDark ? "text-slate-600" : "text-gray-300"
                            }`}
                          />
                          <p>No orders yet</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    orderHistory.map((order) => (
                      <tr
                        key={order.id}
                        className={`border-b transition ${
                          isDark
                            ? "border-slate-700 hover:bg-slate-700/50"
                            : "border-gray-100 hover:bg-gray-50/50"
                        }`}
                      >
                        <td
                          className={`px-6 py-4 text-sm font-medium ${
                            isDark ? "text-white" : "text-gray-900"
                          }`}
                        >
                          #{order.id}
                        </td>
                        <td
                          className={`px-6 py-4 text-sm ${
                            isDark ? "text-slate-300" : "text-gray-600"
                          }`}
                        >
                          {order.items?.map((item, idx) => (
                            <div key={idx}>
                              {item.productName} ×{item.quantity}
                            </div>
                          ))}
                        </td>
                        <td
                          className={`px-6 py-4 text-sm font-semibold ${
                            isDark ? "text-white" : "text-gray-900"
                          }`}
                        >
                          ₹{Number(order.totalAmount || 0).toFixed(2)}
                        </td>
                        <td
                          className={`px-6 py-4 text-sm ${
                            isDark ? "text-slate-300" : "text-gray-600"
                          }`}
                        >
                          {order.createdAt
                            ? new Date(order.createdAt).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-block px-3 py-1 rounded-lg text-sm font-medium ${
                              order.status === "PLACED"
                                ? isDark
                                  ? "bg-yellow-900/40 text-yellow-300"
                                  : "bg-yellow-100 text-yellow-900"
                                : order.status === "SHIPPED"
                                  ? isDark
                                    ? "bg-blue-900/40 text-blue-300"
                                    : "bg-blue-100 text-blue-900"
                                  : isDark
                                    ? "bg-green-900/40 text-green-300"
                                    : "bg-green-100 text-green-900"
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {order.status === "PLACED" ? (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <select
                                  value={distributorSelections[order.id] || ""}
                                  onChange={(e) =>
                                    setDistributorSelections((prev) => ({
                                      ...prev,
                                      [order.id]: e.target.value,
                                    }))
                                  }
                                  disabled={confirmSubmitting === order.id}
                                  className={`text-sm rounded-lg px-2 py-1.5 border ${
                                    isDark
                                      ? "bg-slate-700 border-slate-600 text-white"
                                      : "bg-white border-gray-300 text-gray-900"
                                  }`}
                                >
                                  <option value="">Choose distributor</option>
                                  {myDistributors.map((d) => (
                                    <option key={d.id} value={d.id}>
                                      {d.name}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => handleConfirmOrder(order.id)}
                                  disabled={
                                    !distributorSelections[order.id] ||
                                    confirmSubmitting === order.id
                                  }
                                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-50"
                                >
                                  {confirmSubmitting === order.id
                                    ? "Confirming..."
                                    : "Confirm Order"}
                                </button>
                              </div>
                              {myDistributors.length === 0 &&
                                !distributorsLoading && (
                                  <span
                                    className={`text-xs ${
                                      isDark ? "text-slate-400" : "text-gray-500"
                                    }`}
                                  >
                                    No distributors in your network yet — add
                                    one from the "My Distributors" tab.
                                  </span>
                                )}
                            </div>
                          ) : (
                            <span
                              className={
                                isDark ? "text-slate-500" : "text-gray-400"
                              }
                            >
                              -
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default RetailerDashboard;