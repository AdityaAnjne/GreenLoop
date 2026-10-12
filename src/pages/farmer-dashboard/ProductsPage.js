import { useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { useState, useEffect, useCallback } from "react";
import { deleteProductFromBackend } from "../api";
import axiosInstance from "../../api/axiosInstance";
import "../../styles/products.css";

function ProductsPage({ products = [], onDeleteProduct, onRefreshProducts }) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredProducts, setFilteredProducts] = useState(products);
  const [loading, setLoading] = useState(true);
  const [farmerOrders, setFarmerOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState(false);

  // Simulated loading effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilteredProducts(products);
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [products]);

  const fetchFarmerOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const response = await axiosInstance.get("/api/orders/farmer");
      setFarmerOrders(Array.isArray(response.data) ? response.data : []);
      setOrdersError(false);
    } catch (error) {
      console.error("Failed to load farmer sales summary:", error);
      setFarmerOrders([]);
      setOrdersError(true);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFarmerOrders();
  }, [fetchFarmerOrders]);

  const deliveredItems = farmerOrders.flatMap((order) => order.items || [])
    .filter((item) => item.status === "DELIVERED");
  const fulfilledRevenue = deliveredItems.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
  const fulfilledQuantity = deliveredItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const activeOrderCount = farmerOrders.filter((order) =>
    (order.items || []).some((item) => !["DELIVERED", "CANCELLED"].includes(item.status)),
  ).length;
  const cropSales = deliveredItems.reduce((totals, item) => {
    const name = item.productName || "Produce";
    totals[name] = (totals[name] || 0) + Number(item.quantity || 0);
    return totals;
  }, {});
  const topCrop = Object.entries(cropSales).sort((a, b) => b[1] - a[1])[0];
  const freshHarvestOrders = farmerOrders.filter((order) =>
    (order.items || []).some((item) => item.productTypeAtPurchase === "FRESH_HARVEST" && item.status === "CONFIRMED"),
  );

  const confirmHarvest = async (orderId) => {
    try {
      await axiosInstance.put(`/api/orders/${orderId}/harvest`);
      await fetchFarmerOrders();
    } catch (error) {
      window.alert(error.message || "Could not confirm harvest. Please try again.");
    }
  };

  // Dynamic Base URL - always reflects wherever this app is actually running
  const getBaseUrl = () => {
    return window.location.origin;
  };

  // Removed duplicate in-page logout.
  // Logout is now handled exclusively via the global Navbar button.

  // Delete product - actually persists to the backend now
  const handleDeleteProduct = async (productId) => {
    if (!window.confirm("Are you sure you want to delete this product?")) {
      return;
    }

    try {
      await deleteProductFromBackend(productId);

      // Only remove from the UI after the backend confirms deletion
      if (onDeleteProduct) {
        onDeleteProduct(productId);
      } else if (onRefreshProducts) {
        onRefreshProducts();
      }
    } catch (error) {
      alert(error.message || "Failed to delete product. Please try again.");
    }
  };

  // Download QR Code
  const downloadQRCode = (id, name) => {
    try {
      const canvas = document.getElementById(`qrcode-${id}`);
      if (!canvas) throw new Error("QR canvas not found");

      const pngUrl = canvas.toDataURL("image/png");
      const safeName = (name || "product")
        .toString()
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-");

      const link = document.createElement("a");
      link.href = pngUrl;
      link.download = `${safeName}-qr.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to download QR:", err);
    }
  };

  // Filter products
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProducts(products);
    } else {
      const q = searchQuery.toLowerCase();
      setFilteredProducts(
        products.filter(
          (prod) =>
            (prod.cropType || "").toLowerCase().includes(q) ||
            (prod.soilType || "").toLowerCase().includes(q)
        )
      );
    }
  }, [searchQuery, products]);

  return (
    <div className="products-page">
      <div className="products-container">
        {/* 🔹 Header */}
        <div className="products-header">
          <h1>Farm Products</h1>
          <p>Manage your agricultural products and track their journey</p>
        </div>

        <section aria-label="Sales overview" style={{ margin: "1.5rem 0", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "1rem" }}>
          {[
            { label: "Delivered revenue", value: `₹${fulfilledRevenue.toFixed(2)}`, detail: "Completed orders · all time" },
            { label: "Delivered produce", value: `${fulfilledQuantity} kg`, detail: "Quantity fulfilled · all time" },
            { label: "Active orders", value: activeOrderCount, detail: "Not yet delivered or cancelled" },
            { label: "Top-selling crop", value: topCrop ? topCrop[0] : "—", detail: topCrop ? `${topCrop[1]} kg delivered` : "No completed sales yet" },
          ].map((stat) => (
            <div key={stat.label} style={{ background: "var(--bg-card, #fff)", border: "1px solid var(--border-color, #e5e7eb)", borderRadius: "12px", padding: "1rem 1.1rem", boxShadow: "0 2px 8px rgba(15, 23, 42, 0.05)" }}>
              <div style={{ color: "var(--text-muted, #64748b)", fontSize: "0.8rem", fontWeight: 600 }}>{stat.label}</div>
              <div style={{ color: "var(--text-primary, #111827)", fontSize: "1.45rem", fontWeight: 750, margin: "0.35rem 0" }}>{ordersLoading ? "…" : ordersError ? "Unavailable" : stat.value}</div>
              <div style={{ color: "var(--text-muted, #64748b)", fontSize: "0.72rem" }}>{ordersError ? "Could not load sales data" : stat.detail}</div>
            </div>
          ))}
        </section>

        {freshHarvestOrders.length > 0 && (
          <section aria-label="Fresh Harvest orders" style={{ margin: "1.5rem 0", background: "var(--bg-card, #fff)", border: "1px solid var(--border-color, #e5e7eb)", borderRadius: "12px", padding: "1.25rem" }}>
            <h2 style={{ color: "var(--text-primary)", fontSize: "1.15rem", fontWeight: 700, marginBottom: "0.75rem" }}>Fresh Harvest orders to complete</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>Confirm when the produce has actually been harvested. This updates the customer’s order timeline.</p>
            <div style={{ display: "grid", gap: "0.65rem" }}>
              {freshHarvestOrders.map((order) => {
                const items = (order.items || []).filter((item) => item.productTypeAtPurchase === "FRESH_HARVEST" && item.status === "CONFIRMED");
                return (
                  <div key={order.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem" }}>
                    <div style={{ color: "var(--text-primary)" }}>
                      <strong>Order #{order.id}</strong>
                      <span style={{ color: "var(--text-muted)", marginLeft: "0.5rem" }}>{items.map((item) => `${item.productName} × ${item.quantity} kg`).join(", ")}</span>
                    </div>
                    <button onClick={() => confirmHarvest(order.id)} className="btn-add-product">Confirm harvested</button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 🔹 Actions Bar (logout handled in global Navbar) */}
        <div className="products-actions">
          <input
            type="text"
            placeholder="Search by crop or soil..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              fontSize: "14px",
              flex: 1,
              maxWidth: "400px",
            }}
          />

          <div style={{ display: "flex", gap: "1rem" }}>
            <button
              className="btn-add-product"
              onClick={() => navigate("/add-product")}
            >
              <span>➕</span> Add Product
            </button>
          </div>
        </div>

        {/* 🔹 Loading State */}
        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: "3rem",
              fontSize: "1.25rem",
            }}
          >
            ⏳ Loading products...
          </div>
        ) : filteredProducts.length === 0 ? (
          // 🔹 Empty State
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <h3>No products found</h3>
            <p>Try adjusting your search or add a new product.</p>
            <button
              className="btn-add-product"
              onClick={() => navigate("/add-product")}
            >
              <span>➕</span> Add Your First Product
            </button>
          </div>
        ) : (
          // 🔹 Products Grid
          <div className="products-grid">
            {filteredProducts.map((prod, index) => (
              <div key={prod.id || index} className="product-card">
                {/* Product Image */}
                <img
                  src={
                    prod.imageUrl ||
                    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDQwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTAwIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM5Q0E3QTciPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4="
                  }
                  alt={prod.cropType}
                  className="product-image"
                  onError={(e) => {
                    e.target.src =
                      "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDQwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTAwIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM5Q0E3QTciPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4=";
                  }}
                />

                {/* Product Content */}
                <div className="product-content">
                  <h3 className="product-name">{prod.cropType}</h3>

                  <div className="product-meta">
                    {prod.productType !== "FRESH_HARVEST" && prod.quantity != null && Number.isFinite(Number(prod.quantity)) && (
                      <div className="meta-item">
                        <strong>Stock:</strong> {prod.quantity} kg
                        {prod.quantity <= 5 && (
                          <span style={{ marginLeft: "0.5rem", color: prod.quantity <= 2 ? "#b91c1c" : "#b45309", fontWeight: 700 }}>
                            {prod.quantity <= 2 ? "Replenish soon" : "Low stock"}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="meta-item">
                      <strong>Soil:</strong> {prod.soilType}
                    </div>
                    <div className="meta-item">
                      <strong>Pesticides:</strong> {prod.pesticides}
                    </div>
                    <div className="meta-item">
                      {prod.productType === "FRESH_HARVEST" ? (
                        <span><strong>Type:</strong> Fresh Harvest</span>
                      ) : (
                        <span><strong>Harvest:</strong> {prod.harvestDate}</span>
                      )}
                    </div>
                    <div className="meta-item">
                      <strong>Price:</strong> ₹{(prod.price ?? 0).toFixed(2)}/kg
                    </div>
                    <div className="meta-item">
                      <strong>Retailer ID:</strong>{" "}
                      {prod.retailerId ?? "Not assigned"}
                    </div>
                  </div>

                  {/* QR Code */}
                  <div
                    style={{
                      textAlign: "center",
                      padding: "1rem 0",
                      borderTop: "1px solid #e5e7eb",
                      borderBottom: "1px solid #e5e7eb",
                      marginBottom: "1rem",
                    }}
                  >
                    <QRCodeCanvas
                      id={`qrcode-${prod.id}`}
                      value={`${getBaseUrl()}/product/${prod.id}`}
                      size={100}
                    />
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--text-muted)",
                        marginTop: "0.5rem",
                      }}
                    >
                      ID: {prod.id}
                    </div>
                    <button
                      onClick={() => downloadQRCode(prod.id, prod.cropType)}
                      style={{
                        marginTop: "0.5rem",
                        padding: "0.375rem 0.75rem",
                        background: "#10b981",
                        color: "white",
                        fontSize: "12px",
                        fontWeight: 600,
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                      }}
                    >
                      ⬇️ Download QR
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="product-actions">
                    <button
                      className="btn-edit"
                      onClick={() => navigate(`/edit-product/${prod.id}`)}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDeleteProduct(prod.id)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductsPage;
