import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  Heart,
  Star,
  Truck,
  BadgeCheck,
  X,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import axiosInstance from "../api/axiosInstance";
import TrackOrderModal from "./TrackOrderModal";

const formatINR = (price) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(price) || 0);
};

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  // State for products from backend
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [myOrders, setMyOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState(null);
  const [detailsProduct, setDetailsProduct] = useState(null);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("COD");

  // Whitelist of products based on local grocery folder files
  const WHITELIST = [
    "apple",
    "banana",
    "basmati",
    "carrot",
    "chilli",
    "corn",
    "grapes",
    "mango",
    "onion",
    "potato",
    "rotten_potato",
    "strawberry",
    "tomato",
    "wheat",
  ];

  // Emoji mapping for whitelisted products
  const EMOJI_MAP = {
    apple: "🍎",
    banana: "🍌",
    basmati: "🌾",
    carrot: "🥕",
    chilli: "🌶️",
    corn: "🌽",
    grapes: "🍇",
    mango: "🥭",
    onion: "🧅",
    potato: "🥔",
    rotten_potato: "🥔💀",
    strawberry: "🍓",
    tomato: "🍅",
    wheat: "🌾",
  };

  // Check if product matches whitelist
  const isWhitelisted = (product) => {
    const productName = (product.cropType || product.name || "")
      .toLowerCase()
      .trim();

    return WHITELIST.some((key) => productName.includes(key));
  };

  const PRODUCT_DETAILS = {
    onion: {
      healthBenefit: "Supports heart health and boosts immunity",
      description: "A kitchen staple used in countless dishes — can be sautéed, roasted, grilled, or eaten raw in salads.",
      shelfLife: "7-10 days",
    },
    tomato: {
      healthBenefit: "Rich in antioxidants, supports skin and heart health",
      description: "Versatile and juicy, perfect for curries, salads, sauces, or eating fresh.",
      shelfLife: "5-7 days",
    },
    potato: {
      healthBenefit: "Good source of potassium and vitamin C",
      description: "A versatile staple that can be boiled, mashed, roasted, or fried.",
      shelfLife: "2-3 weeks",
    },
    carrot: {
      healthBenefit: "High in beta-carotene, supports eye health",
      description: "Crunchy and naturally sweet, great raw, roasted, or in soups and salads.",
      shelfLife: "2-3 weeks",
    },
    banana: {
      healthBenefit: "Good source of potassium and quick energy",
      description: "A naturally sweet, ready-to-eat fruit, perfect any time of day.",
      shelfLife: "3-5 days",
    },
    apple: {
      healthBenefit: "High in fiber, supports digestion",
      description: "Crisp and refreshing, great eaten whole or added to salads.",
      shelfLife: "2-4 weeks",
    },
    mango: {
      healthBenefit: "Rich in vitamin A and C",
      description: "Sweet and juicy, best enjoyed fresh or blended into smoothies.",
      shelfLife: "4-7 days",
    },
    strawberry: {
      healthBenefit: "High in vitamin C and antioxidants",
      description: "Sweet and delicate, best eaten fresh or added to desserts.",
      shelfLife: "2-3 days",
    },
    grapes: {
      healthBenefit: "Contains antioxidants that support heart health",
      description: "Sweet, refreshing, and easy to snack on straight from the bunch.",
      shelfLife: "5-7 days",
    },
    orange: {
      healthBenefit: "Excellent source of vitamin C",
      description: "Juicy and tangy, great for snacking or fresh juice.",
      shelfLife: "1-2 weeks",
    },
    corn: {
      healthBenefit: "Good source of fiber and B vitamins",
      description: "Sweet and starchy, great boiled, grilled, or roasted.",
      shelfLife: "3-5 days",
    },
    cucumber: {
      healthBenefit: "Hydrating and low in calories",
      description: "Crisp and refreshing, ideal for salads or as a light snack.",
      shelfLife: "5-7 days",
    },
    pepper: {
      healthBenefit: "Rich in vitamin C and antioxidants",
      description: "Adds color and crunch to stir-fries, salads, and curries.",
      shelfLife: "1-2 weeks",
    },
    chilli: {
      healthBenefit: "Contains capsaicin, may boost metabolism",
      description: "Adds heat and flavor to curries and everyday cooking.",
      shelfLife: "1-2 weeks",
    },
    broccoli: {
      healthBenefit: "High in fiber, vitamin C, and vitamin K",
      description: "A nutrient-dense vegetable, great steamed, roasted, or stir-fried.",
      shelfLife: "5-7 days",
    },
    avocado: {
      healthBenefit: "Rich in healthy fats and fiber",
      description: "Creamy and versatile, perfect for salads, toast, or guacamole.",
      shelfLife: "3-5 days",
    },
    peas: {
      healthBenefit: "Good source of plant protein and fiber",
      description: "Sweet and tender, great in curries, rice dishes, or as a side.",
      shelfLife: "3-5 days",
    },
    lettuce: {
      healthBenefit: "Low calorie, hydrating, and rich in vitamin K",
      description: "Crisp leafy greens, ideal as a salad base or sandwich filler.",
      shelfLife: "5-7 days",
    },
    radish: {
      healthBenefit: "Low in calories, good source of vitamin C",
      description: "Crunchy and peppery, great raw in salads or pickled.",
      shelfLife: "1-2 weeks",
    },
    wheat: {
      healthBenefit: "Good source of complex carbohydrates and fiber",
      description: "A dietary staple, ground into flour for breads and everyday cooking.",
      shelfLife: "Several months (dry storage)",
    },
    basmati: {
      healthBenefit: "Low glycemic index compared to other rice varieties",
      description: "Long-grain, aromatic rice, a staple for everyday meals.",
      shelfLife: "Several months (dry storage)",
    },
  };

  const DEFAULT_PRODUCT_DETAILS = {
    healthBenefit: "Fresh, farm-sourced produce",
    description: "Sourced directly from local farmers for freshness and quality.",
    shelfLife: "Best consumed within a few days of delivery",
  };

  const getProductDetails = (product) => {
    // Priority: real AI-generated content for THIS product → static
    // per-crop lookup (for older products) → honest generic fallback.
    if (product.aiHealthBenefit || product.aiDescription || product.aiShelfLife) {
      return {
        healthBenefit: product.aiHealthBenefit || DEFAULT_PRODUCT_DETAILS.healthBenefit,
        description: product.aiDescription || DEFAULT_PRODUCT_DETAILS.description,
        shelfLife: product.aiShelfLife || DEFAULT_PRODUCT_DETAILS.shelfLife,
      };
    }

    const name = (product.cropType || product.name || "").toLowerCase();
    const key = Object.keys(PRODUCT_DETAILS).find((k) => name.includes(k));
    return key ? PRODUCT_DETAILS[key] : DEFAULT_PRODUCT_DETAILS;
  };

  // Product emoji mapping. This helps future developers.
  const getProductLogo = (product) => {
    const name = (product?.name || product?.cropType || "").toLowerCase();
    if (name.includes("tomato")) return "🍅";
    if (name.includes("carrot")) return "🥕";
    if (name.includes("banana")) return "🍌";
    if (name.includes("straw") || name.includes("berry")) return "🍓";
    if (
      name.includes("lettuce") ||
      name.includes("spinach") ||
      name.includes("leaf")
    )
      return "🥬";
    if (name.includes("corn")) return "🌽";
    if (name.includes("grape")) return "🍇";
    if (name.includes("mango")) return "🥭";
    if (name.includes("onion")) return "🧅";
    if (name.includes("potato")) return "🥔";
    if (name.includes("apple")) return "🍎";
    if (
      name.includes("wheat") ||
      name.includes("rice") ||
      name.includes("basmati")
    )
      return "🌾";
    if (
      name.includes("chilli") ||
      name.includes("chili") ||
      name.includes("pepper")
    )
      return "🌶️";
    if (name.includes("cucumber")) return "🥒";
    if (name.includes("avocado")) return "🥑";
    if (name.includes("orange")) return "🍊";
    if (name.includes("broccoli")) return "🥦";
    // No specific match - use a generic produce icon rather than hiding the product
    return "🥬";
  };

  const extractProducts = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.products)) return payload.products;
    return [];
  };

  const toDisplayProducts = (rawProducts) => {
    const mappedProducts = (rawProducts || []).map((product) => ({
      ...product,
      id: product.id,
      name: product.name || product.cropType || "Unknown",
      price: product.price ?? 2.5,
      // Rating is DERIVED from freshness (freshness% ÷ 100 × 5), not a
      // separate AI number — so the stars and the freshness badge always
      // agree with each other instead of potentially telling two slightly
      // different stories about the same product. Products with no AI
      // assessment yet show neither, rather than a made-up number.
      rating: product.freshnessPercent != null ? (product.freshnessPercent / 100) * 5 : null,
      freshness: product.freshnessPercent != null ? `${product.freshnessPercent}%` : null,
      shortDescription: product.qualityAnalysis
        ? product.qualityAnalysis.length > 80
          ? product.qualityAnalysis.slice(0, 80).trim() + "..."
          : product.qualityAnalysis
        : null,
      displayIcon: getProductLogo(product),
      imageUrl: product.imageUrl || null,
    }));

    const seenIds = new Map();
    return mappedProducts.filter((product) => {
      if (seenIds.has(product.id)) return false;
      seenIds.set(product.id, true);
      return true;
    });
  };

  // Fetch all available products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    const loadProducts = async (path) => {
      const response = await axiosInstance.get(path);
      return toDisplayProducts(extractProducts(response.data));
    };

    try {
      const productsFromApi = await loadProducts(
        "/api/products/customer/products",
      );
      setProducts(productsFromApi);
    } catch (primaryError) {
      console.log("[CustomerDashboard] primary fetch error", primaryError);

      setError({
        status: primaryError?.status ?? 0,
        message:
          primaryError?.message || "Failed to load products from backend",
        data: primaryError?.data,
      });
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const addToCart = (product) => {
    // Use displayIcon for cart item
    const icon = product.displayIcon || getProductLogo(product);
    const existingItem = cart.find((item) => item.id === product.id);
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        ),
      );
    } else {
      setCart([...cart, { ...product, image: icon, quantity: 1 }]);
    }
  };

  const toggleWishlist = (product) => {
    if (wishlist.find((item) => item.id === product.id)) {
      setWishlist(wishlist.filter((item) => item.id !== product.id));
    } else {
      setWishlist([...wishlist, product]);
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId, change) => {
    setCart(
      cart
        .map((item) => {
          if (item.id === productId) {
            const newQuantity = item.quantity + change;
            return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
          }
          return item;
        })
        .filter((item) => item.quantity > 0),
    );
  };

  const getDeliveryCoords = () =>
    new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ lat: null, lng: null });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }),
        () => resolve({ lat: null, lng: null }),
        { timeout: 8000 },
      );
    });

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    if (!deliveryAddress.trim()) {
      alert("Please enter a delivery address");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please login to place an order");
        return;
      }

      const { lat, lng } = await getDeliveryCoords();

      const response = await axiosInstance.post(
        "/api/orders",
        {
          items: cart.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
          })),
          deliveryAddress: deliveryAddress.trim(),
          deliveryLatitude: lat,
          deliveryLongitude: lng,
          paymentMethod: paymentMethod,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      alert(
        "Order placed successfully! 🎉\n\nYour fresh produce will be delivered soon.\nTrack your order from farm to door.",
      );
      setCart([]);
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to place order";
      alert(`Order failed: ${errorMessage}`);
    }
  };

  // Fetch this customer's own order history
  const fetchMyOrders = async () => {
    setOrdersLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setMyOrders([]);
        return;
      }

      const response = await axiosInstance.get("/api/orders/customer", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setMyOrders(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Failed to fetch order history:", error);
      setMyOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const openOrdersModal = () => {
    setShowOrdersModal(true);
    fetchMyOrders();
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Cancel this order? This cannot be undone.")) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please login to cancel this order");
        return;
      }

      await axiosInstance.put(
        `/api/orders/${orderId}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );

      fetchMyOrders();
    } catch (error) {
      alert(
        error.response?.data?.message || "Failed to cancel order. Please try again.",
      );
    }
  };

  useEffect(() => {
    if (!showOrdersModal) return;

    const interval = setInterval(() => {
      fetchMyOrders();
    }, 15000); // refresh every 15s while the modal is open

    return () => clearInterval(interval);
  }, [showOrdersModal]);

  // ✅ Pre-fill delivery address from the customer's saved default (empty on
  // a brand-new account — first order still requires typing it in).
  useEffect(() => {
    const loadSavedAddress = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const response = await axiosInstance.get("/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.data?.deliveryAddress) {
          setDeliveryAddress(response.data.deliveryAddress);
        }
      } catch (err) {
        // Non-fatal — customer just types their address like normal
        console.error("Failed to load saved address:", err);
      }
    };

    loadSavedAddress();
  }, []);

  // Calculate cart total
  const cartTotalINR = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  // Deduplicate by id before rendering to avoid repeated cards in UI.
  const dedupedProducts = Array.from(
    new Map(
      (products || []).map((p) => [
        p.id ?? `${p.cropType}-${p.harvestDate ?? ""}`,
        p,
      ]),
    ),
  ).map(([, v]) => v);

  return (
    // Dark mode applied to entire page wrapper with smooth transition
    <div
      className={`min-h-screen transition-colors duration-200 ${
        isDark
          ? "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white"
          : "bg-gradient-to-br from-emerald-50 via-white to-green-50"
      }`}
    >
      {/* My Orders Modal */}
      {showOrdersModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className={`rounded-3xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col transform transition-all ${
              isDark ? "bg-slate-800" : "bg-white"
            }`}
          >
            <div className="bg-gradient-to-r from-emerald-500 to-green-600 p-6 text-white flex-shrink-0">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold">My Orders</h3>
                  <p className="text-emerald-50 mt-1 text-sm">
                    Track your order status
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={fetchMyOrders}
                    disabled={ordersLoading}
                    title="Refresh orders"
                    className="p-2 hover:bg-white/20 rounded-full transition disabled:opacity-50"
                  >
                    <RefreshCw
                      size={20}
                      className={ordersLoading ? "animate-spin" : ""}
                    />
                  </button>
                  <button
                    onClick={() => setShowOrdersModal(false)}
                    className="p-2 hover:bg-white/20 rounded-full transition"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>
            </div>

            <div
              className={`p-6 overflow-y-auto ${
                isDark ? "bg-slate-800" : "bg-white"
              }`}
            >
              {ordersLoading && myOrders.length === 0 ? (
                <p
                  className={`text-center py-8 ${
                    isDark ? "text-slate-400" : "text-gray-500"
                  }`}
                >
                  Loading your orders...
                </p>
              ) : myOrders.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart
                    size={40}
                    className={`mx-auto mb-3 ${
                      isDark ? "text-slate-600" : "text-gray-300"
                    }`}
                  />
                  <p
                    className={isDark ? "text-slate-400" : "text-gray-500"}
                  >
                    You haven't placed any orders yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myOrders.map((order) => (
                    <div
                      key={order.id}
                      className={`rounded-xl border p-4 ${
                        isDark
                          ? "border-slate-700 bg-slate-700/30"
                          : "border-gray-200 bg-gray-50"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span
                          className={`font-bold ${
                            isDark ? "text-white" : "text-gray-900"
                          }`}
                        >
                          Order #{order.id}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                            order.status === "DELIVERED"
                              ? isDark
                                ? "bg-green-900/40 text-green-300"
                                : "bg-green-100 text-green-900"
                              : order.status === "CANCELLED"
                                ? isDark
                                  ? "bg-red-900/40 text-red-300"
                                  : "bg-red-100 text-red-900"
                                : order.status === "SHIPPED"
                                  ? isDark
                                    ? "bg-blue-900/40 text-blue-300"
                                    : "bg-blue-100 text-blue-900"
                                  : order.status === "PACKED"
                                    ? isDark
                                      ? "bg-indigo-900/40 text-indigo-300"
                                      : "bg-indigo-100 text-indigo-900"
                                    : order.status === "CONFIRMED"
                                      ? isDark
                                        ? "bg-cyan-900/40 text-cyan-300"
                                        : "bg-cyan-100 text-cyan-900"
                                      : isDark
                                        ? "bg-yellow-900/40 text-yellow-300"
                                        : "bg-yellow-100 text-yellow-900"
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>

                      <div
                        className={`text-sm mb-2 ${
                          isDark ? "text-slate-300" : "text-gray-600"
                        }`}
                      >
                        {order.items?.map((item, idx) => (
                          <div key={idx}>
                            {item.productName} × {item.quantity}
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between items-center">
                        <span
                          className={`text-sm ${
                            isDark ? "text-slate-400" : "text-gray-500"
                          }`}
                        >
                          {order.createdAt
                            ? new Date(order.createdAt).toLocaleDateString()
                            : "-"}
                        </span>
                        <span
                          className={`font-bold ${
                            isDark ? "text-white" : "text-gray-900"
                          }`}
                        >
                          ₹{Number(order.totalAmount || 0).toFixed(2)}
                        </span>
                      </div>

                      <button
                        onClick={() => setTrackingOrderId(order.id)}
                        className={`mt-3 w-full text-sm font-medium py-2 rounded-lg border transition-colors ${
                          isDark
                            ? "border-emerald-700 text-emerald-400 hover:bg-emerald-900/30"
                            : "border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                        }`}
                      >
                        Track this order
                      </button>

                      {(order.status === "PLACED" || order.status === "CONFIRMED") && (
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          className={`mt-2 w-full text-sm font-medium py-2 rounded-lg border transition-colors ${
                            isDark
                              ? "border-red-800 text-red-400 hover:bg-red-900/30"
                              : "border-red-300 text-red-600 hover:bg-red-50"
                          }`}
                        >
                          Cancel order
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {trackingOrderId && (
        <TrackOrderModal
          orderId={trackingOrderId}
          isDark={isDark}
          onClose={() => setTrackingOrderId(null)}
        />
      )}

      {detailsProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className={`rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto ${
              isDark ? "bg-slate-800 text-white" : "bg-white text-gray-900"
            }`}
          >
            <div className="flex justify-between items-start p-6 pb-4">
              <h3 className="text-xl font-bold">{detailsProduct.name} - Product Details</h3>
              <button
                onClick={() => setDetailsProduct(null)}
                className="p-1 rounded-full hover:bg-black/10"
              >
                <X size={22} />
              </button>
            </div>

            <div className="px-6 pb-6 space-y-5 text-sm">
              <div>
                <p className={`font-semibold mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                  Health Benefits
                </p>
                <p className={isDark ? "text-slate-400" : "text-gray-600"}>
                  {getProductDetails(detailsProduct).healthBenefit}
                </p>
              </div>

              <div>
                <p className={`font-semibold mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                  Description
                </p>
                <p className={isDark ? "text-slate-400" : "text-gray-600"}>
                  {getProductDetails(detailsProduct).description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className={`font-semibold mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Unit
                  </p>
                  <p className={isDark ? "text-slate-400" : "text-gray-600"}>1 kg</p>
                </div>
                <div>
                  <p className={`font-semibold mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Shelf Life
                  </p>
                  <p className={isDark ? "text-slate-400" : "text-gray-600"}>
                    {getProductDetails(detailsProduct).shelfLife}
                  </p>
                </div>
              </div>

              <div>
                <p className={`font-semibold mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                  Country of Origin
                </p>
                <p className={isDark ? "text-slate-400" : "text-gray-600"}>India</p>
              </div>

              <div>
                <p className={`font-semibold mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                  Return Policy
                </p>
                <p className={isDark ? "text-slate-400" : "text-gray-600"}>
                  Only replacement is offered, within 48 hours of delivery, if the item
                  is found to be of poor quality, damaged, or incorrect.
                </p>
              </div>

              <div>
                <p className={`font-semibold mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                  Customer Care
                </p>
                <p className={isDark ? "text-slate-400" : "text-gray-600"}>
                  support@greenloop.app
                </p>
              </div>

              <div
                className={`text-xs pt-3 border-t ${
                  isDark ? "border-slate-700 text-slate-500" : "border-gray-200 text-gray-400"
                }`}
              >
                Disclaimer: Every effort is made to maintain the accuracy of this
                information. Actual product may vary slightly.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header - dark mode aware */}
      <header
        className={`backdrop-blur-xl border-b sticky top-0 z-40 transition-colors duration-200 ${
          isDark
            ? "bg-slate-800/80 border-slate-700"
            : "bg-white/80 border-white/50"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              {/* Removed emoji from marketplace heading */}
              <h1
                className={`text-3xl font-bold ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                GreenLoop Marketplace
              </h1>
              <p
                className={
                  isDark ? "text-slate-400 mt-1" : "text-gray-600 mt-1"
                }
              >
                Fresh produce from local farms
              </p>
            </div>
            <button
              onClick={openOrdersModal}
              className={`px-4 py-2 rounded-xl font-semibold transition ${
                isDark
                  ? "bg-slate-700 text-white hover:bg-slate-600"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              My Orders
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Marketplace Section */}
          <div className="lg:col-span-2">
            {/* Featured Banner */}
            <div
              className={`backdrop-blur-xl border rounded-3xl p-12 mb-12 overflow-hidden relative transition-colors duration-200 ${
                isDark
                  ? "bg-gradient-to-r from-emerald-500/10 to-green-500/10 border-emerald-900/30"
                  : "bg-gradient-to-r from-emerald-500/20 to-green-500/20 border-emerald-200/50"
              }`}
            >
              <div className="relative z-10">
                <h2
                  className={`text-4xl font-bold mb-4 ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Farm Fresh Delivered
                </h2>
                <p
                  className={`text-xl mb-6 max-w-2xl ${
                    isDark ? "text-slate-300" : "text-gray-800"
                  }`}
                >
                  Direct from our network of certified organic farms. Traceable,
                  sustainable, and delicious.
                </p>
                <div className="flex gap-4">
                  <div
                    className={`flex items-center gap-2 backdrop-blur-sm rounded-full px-4 py-2 transition-colors duration-200 ${
                      isDark ? "bg-slate-700/50" : "bg-white/80"
                    }`}
                  >
                    <BadgeCheck className="text-emerald-600" size={20} />
                    <span
                      className={`text-sm font-semibold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Certified Organic
                    </span>
                  </div>
                  <div
                    className={`flex items-center gap-2 backdrop-blur-sm rounded-full px-4 py-2 transition-colors duration-200 ${
                      isDark ? "bg-slate-700/50" : "bg-white/80"
                    }`}
                  >
                    <Truck className="text-emerald-600" size={20} />
                    <span
                      className={`text-sm font-semibold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Fast Delivery
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Products Grid */}
            <div className="mb-8">
              <h3
                className={`text-2xl font-bold mb-6 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Available Products
              </h3>

              {/* Loading state */}
              {loading && (
                <div className="text-center py-8">
                  <p className={isDark ? "text-gray-300" : "text-gray-600"}>
                    Loading products...
                  </p>
                </div>
              )}

              {/* Error state */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-red-800 font-semibold">
                      Failed to load products
                    </p>
                    <p className="text-red-700 text-sm mt-1">
                      Status: {error.status || "N/A"} — {error.message}
                    </p>
                  </div>
                  <button
                    onClick={fetchProducts}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-semibold"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Products grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {dedupedProducts.map((product, idx) => (
                  <div
                    key={product.id ?? `${product.cropType}-${idx}`}
                    className={`backdrop-blur-xl border rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition transform hover:scale-105 ${
                      isDark
                        ? "bg-slate-700/40 border-slate-600"
                        : "bg-white/80 border-white/50"
                    }`}
                  >
                    {/* Product Image */}
                    <div className="h-40 bg-gradient-to-br from-emerald-200 to-green-300 flex items-center justify-center relative overflow-hidden">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.parentElement.textContent =
                              product.displayIcon || "🥬";
                          }}
                        />
                      ) : (
                        <div className="text-7xl">
                          {product.displayIcon || "🥬"}
                        </div>
                      )}

                      {/* Wishlist button */}
                      <button
                        onClick={() => toggleWishlist(product)}
                        className={`absolute top-3 right-3 p-2 shadow-sm rounded-full hover:bg-white transition ${
                          isDark ? "bg-slate-700" : "bg-white/95"
                        }`}
                      >
                        <Heart
                          size={20}
                          className={
                            wishlist.find((item) => item.id === product.id)
                              ? "fill-red-500 text-red-500"
                              : "text-gray-400"
                          }
                        />
                      </button>
                    </div>

                    {/* Product Info */}
                    <div className="p-6">
                      <h4
                        className={`text-lg font-bold mb-1 ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {product.name}
                      </h4>

                      {product.shortDescription && (
                        <p
                          className={`text-xs mb-2 ${
                            isDark ? "text-slate-400" : "text-gray-500"
                          }`}
                        >
                          {product.shortDescription}
                        </p>
                      )}

                      {/* Freshness Badge - only shown when the AI actually
                          assessed this product; no fake fallback number */}
                      {product.freshness && (
                        <div className="mb-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-semibold ${
                                isDark ? "text-slate-300" : "text-gray-700"
                              }`}
                            >
                              Freshness
                            </span>
                            <span className="bg-green-100 text-green-900 px-2 py-1 rounded text-xs font-bold">
                              {product.freshness}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Rating - real AI quality score out of 5 */}
                      <div className="flex items-center gap-2 mb-4">
                        {product.rating != null ? (
                          <>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  size={16}
                                  className={
                                    i < Math.round(product.rating)
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-gray-300"
                                  }
                                />
                              ))}
                            </div>
                            <span
                              className={`text-sm ${
                                isDark ? "text-slate-400" : "text-gray-600"
                              }`}
                            >
                              {product.rating.toFixed(1)}
                            </span>
                          </>
                        ) : (
                          <span
                            className={`text-sm italic ${
                              isDark ? "text-slate-500" : "text-gray-400"
                            }`}
                          >
                            Not yet rated
                          </span>
                        )}
                      </div>

                      {/* Price */}
                      <div
                        className={`mb-4 pt-4 ${
                          isDark
                            ? "border-t border-slate-600"
                            : "border-t border-gray-200"
                        }`}
                      >
                        <p className="text-2xl font-bold text-emerald-600">
                          {formatINR(product.price)}
                        </p>
                        <p
                          className={`text-xs ${
                            isDark ? "text-slate-500" : "text-gray-500"
                          }`}
                        >
                          per kg
                        </p>
                      </div>

                      {/* Buy Button */}
                      <button
                        onClick={() => addToCart(product)}
                        className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold py-2 rounded-lg transition-all duration-200 transform hover:scale-105"
                      >
                        Buy Now
                      </button>

                      <button
                        onClick={() => setDetailsProduct(product)}
                        className={`w-full mt-2 text-sm font-medium py-2 rounded-lg border transition-colors ${
                          isDark
                            ? "border-slate-600 text-slate-300 hover:bg-slate-700/50"
                            : "border-gray-300 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cart Section - Persistent Side Panel */}
          <div className="lg:col-span-1">
            {/* Cart Items */}
            <div
              className={`backdrop-blur-xl border rounded-2xl overflow-hidden shadow-lg sticky top-24 transition-colors duration-200 ${
                isDark
                  ? "bg-slate-700/40 border-slate-600"
                  : "bg-white/80 border-white/50"
              }`}
            >
              <div
                className={`p-6 ${
                  isDark ? "border-slate-600" : "border-gray-200"
                } border-b`}
              >
                <h2
                  className={`text-2xl font-bold ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Shopping Cart ({cart.length} items)
                </h2>
              </div>

              {cart.length === 0 ? (
                <div className="p-8 text-center">
                  <ShoppingCart
                    size={40}
                    className={`mx-auto mb-3 ${
                      isDark ? "text-slate-600" : "text-gray-300"
                    }`}
                  />
                  <p
                    className={`text-sm font-medium ${
                      isDark ? "text-slate-400" : "text-gray-500"
                    }`}
                  >
                    Your cart is empty
                  </p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <div
                    className={isDark ? "divide-slate-600" : "divide-gray-200"}
                  >
                    {cart.map((item) => (
                      <div
                        key={item.id}
                        className={`p-4 transition ${
                          isDark
                            ? "hover:bg-slate-600/50"
                            : "hover:bg-gray-50/50"
                        }`}
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center text-3xl bg-emerald-50 flex-shrink-0">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                  e.target.parentElement.textContent =
                                    item.image || "🥬";
                                }}
                              />
                            ) : (
                              item.image
                            )}
                          </div>
                          <div className="flex-1">
                            <p
                              className={`font-bold text-sm ${
                                isDark ? "text-white" : "text-gray-900"
                              }`}
                            >
                              {item.name}
                            </p>
                            <p
                              className={`text-xs ${
                                isDark ? "text-slate-400" : "text-gray-600"
                              }`}
                            >
                              {formatINR(item.price)}/kg
                            </p>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className={isDark ? "text-red-500" : "text-red-600"}
                          >
                            <X size={16} />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              aria-label="Decrease quantity"
                              onClick={() => updateQuantity(item.id, -1)}
                              className={`w-8 h-8 rounded-md border transition font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                                isDark
                                  ? "bg-slate-600 text-emerald-400 border-emerald-600 hover:bg-slate-700 hover:border-emerald-500"
                                  : "bg-white text-emerald-700 border-emerald-500 shadow-sm hover:bg-emerald-50 hover:border-emerald-600"
                              }`}
                            >
                              −
                            </button>
                            <span
                              className={`w-10 text-center font-semibold text-sm ${
                                isDark ? "text-white" : "text-gray-900"
                              }`}
                            >
                              {item.quantity}
                            </span>
                            <button
                              aria-label="Increase quantity"
                              onClick={() => updateQuantity(item.id, 1)}
                              className={`w-8 h-8 rounded-md border transition font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                                isDark
                                  ? "bg-slate-600 text-emerald-400 border-emerald-600 hover:bg-slate-700 hover:border-emerald-500"
                                  : "bg-white text-emerald-700 border-emerald-500 shadow-sm hover:bg-emerald-50 hover:border-emerald-600"
                              }`}
                            >
                              +
                            </button>
                          </div>
                          <p className="text-sm font-bold text-emerald-600">
                            {new Intl.NumberFormat("en-IN", {
                              style: "currency",
                              currency: "INR",
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }).format(item.price * item.quantity)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cart Summary */}
              {cart.length > 0 && (
                <div
                  className={`p-4 ${
                    isDark ? "border-slate-600" : "border-gray-200"
                  } border-t`}
                >
                  <div className="mb-4">
                    <label
                      className={`text-sm font-medium mb-1 block ${
                        isDark ? "text-slate-300" : "text-gray-700"
                      }`}
                    >
                      Delivery Address
                    </label>
                    <input
                      type="text"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Flat/House no, Street, City, PIN"
                      className={`w-full text-sm rounded-lg px-3 py-2 border ${
                        isDark
                          ? "bg-slate-800 border-slate-600 text-white placeholder-slate-500"
                          : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                      }`}
                    />
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span
                        className={isDark ? "text-slate-400" : "text-gray-600"}
                      >
                        Subtotal
                      </span>
                      <span
                        className={`font-semibold ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {/* Intentionally rounded to integer for cleaner display */}
                        {new Intl.NumberFormat("en-IN", {
                          style: "currency",
                          currency: "INR",
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(Math.round(cartTotalINR))}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span
                        className={isDark ? "text-slate-400" : "text-gray-600"}
                      >
                        Delivery
                      </span>
                      <span
                        className={`font-semibold ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {/* Flat delivery fee in rupees */}
                        {new Intl.NumberFormat("en-IN", {
                          style: "currency",
                          currency: "INR",
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(49)}
                      </span>
                    </div>
                    <div
                      className={`pt-2 flex justify-between ${
                        isDark ? "border-slate-600" : "border-gray-200"
                      } border-t`}
                    >
                      <span
                        className={`font-bold ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        Total
                      </span>
                      <span className="font-bold text-emerald-600">
                        {/* Grand total: subtotal + flat delivery fee, no conversion */}
                        {new Intl.NumberFormat("en-IN", {
                          style: "currency",
                          currency: "INR",
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(Math.round(cartTotalINR + 49))}
                      </span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p
                      className={`text-sm font-medium mb-2 ${
                        isDark ? "text-slate-300" : "text-gray-700"
                      }`}
                    >
                      Payment Method
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: "COD", label: "Cash on Delivery", enabled: true },
                        { id: "UPI", label: "UPI", enabled: false },
                        { id: "CARD", label: "Card", enabled: false },
                        { id: "WALLET", label: "Wallet", enabled: false },
                      ].map((method) => (
                        <button
                          key={method.id}
                          type="button"
                          disabled={!method.enabled}
                          onClick={() => method.enabled && setPaymentMethod(method.id)}
                          className={`relative text-sm font-medium py-2 px-2 rounded-lg border text-left transition-colors ${
                            !method.enabled
                              ? isDark
                                ? "border-slate-700 text-slate-600 bg-slate-800/50 cursor-not-allowed"
                                : "border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed"
                              : paymentMethod === method.id
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : isDark
                              ? "border-slate-600 text-slate-200 hover:border-emerald-600"
                              : "border-gray-300 text-gray-700 hover:border-emerald-600"
                          }`}
                        >
                          {method.label}
                          {!method.enabled && (
                            <span className="absolute top-1 right-1 text-[9px] px-1 rounded bg-amber-500 text-white">
                              Soon
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleCheckout}
                    className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold py-2.5 rounded-lg transition-all duration-200 transform hover:scale-105"
                  >
                    {paymentMethod === "COD" ? "Place Order (Pay on Delivery)" : "Place Order"}
                  </button>

                  <p
                    className={`text-xs text-center mt-3 ${
                      isDark ? "text-slate-500" : "text-gray-500"
                    }`}
                  >
                    ✓ Farm to door traceability
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CustomerDashboard;
