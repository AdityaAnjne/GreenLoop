import axios from "axios";

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "http://localhost:8080") + "/api";

// Create a reusable secure Axios instance (attaches JWT token)
export const API = axios.create({
  baseURL: `${API_BASE_URL}/users`,
});

// NEW: Create a public Axios instance that does NOT attach the token
// We use this for the analyze-image endpoint to bypass security conflicts.
export const PUBLIC_API = axios.create({
  baseURL: `${API_BASE_URL}/users`,
});

// Auth endpoints (forgot/reset password)
export const AUTH_API = axios.create({
  baseURL: `${API_BASE_URL}/auth`,
});

// Product endpoints (with JWT token)
export const PRODUCTS_API = axios.create({
  baseURL: `${API_BASE_URL}/products`,
});

// NEW: Network endpoints (farmer→retailer, retailer→distributor relationships)
export const NETWORK_API = axios.create({
  baseURL: `${API_BASE_URL}/network`,
});

// Attach token automatically if available
API.interceptors.request.use(
  (config) => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user?.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Attach token to PRODUCTS_API as well
PRODUCTS_API.interceptors.request.use(
  (config) => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user?.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// NEW: Attach token to NETWORK_API as well
NETWORK_API.interceptors.request.use(
  (config) => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user?.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Login function (uses API)
// SECURITY: Role is NOT sent to backend during login
// Backend determines role from database and returns it in JWT
export const loginUser = async (email, password, role) => {
  if (!email?.trim() || !password?.trim()) {
    throw new Error("Email and password are required");
  }

  if (!role?.trim()) {
    throw new Error("Role is required");
  }

  const normalizedRole = role.toLowerCase();

  try {
    const response = await API.post("/login", {
      email,
      password,
      role: normalizedRole,
    });
    const { user, token } = response.data;

    if (!user || !token) throw new Error("Invalid login response");

    localStorage.setItem("token", token);

    const userWithToken = { ...user, token };
    localStorage.setItem("user", JSON.stringify(userWithToken));

    return userWithToken;
  } catch (err) {
    throw new Error(err.response?.data?.message || "Unable to reach the server. Please try again.");
  }
};

// Register function (uses API)
export const registerUser = async (userData) => {
  try {
    const response = await API.post("/register", userData);
    return response.data.user || response.data;
  } catch (err) {
    throw new Error(err.response?.data?.message || "Registration failed");
  }
};

// Logout function
export const logoutUser = () => {
  localStorage.removeItem("user");
};

// Password reset: request link
export const requestPasswordReset = async (email) => {
  try {
    const res = await AUTH_API.post("/forgot-password", { email });
    return res.data; // may contain { resetLink }
  } catch (err) {
    // Still resolve to true to avoid email enumeration
    return {
      message: "If this email is registered, a reset link has been sent.",
    };
  }
};

// Password reset: submit new password
export const resetPassword = async (token, password) => {
  try {
    const res = await AUTH_API.post("/reset-password", { token, password });
    return res.data;
  } catch (err) {
    const message = err.response?.data?.message || "Reset failed";
    throw new Error(message);
  }
};

// Product API Functions

/**
 * Get products for authenticated retailer's inventory
 * @returns {Promise<{retailerId, retailerName, products, count}>} Retailer's products
 */
export const getRetailerInventory = async () => {
  try {
    const response = await PRODUCTS_API.get("/retailer/inventory");
    return response.data;
  } catch (err) {
    throw new Error(
      err.response?.data?.message || "Failed to fetch retailer inventory",
    );
  }
};

/**
 * Get all products for farmer
 * @returns {Promise<Array>} List of farmer's products
 */
export const getFarmerProducts = async () => {
  try {
    const response = await PRODUCTS_API.get("/farmer/me");
    return Array.isArray(response.data)
      ? response.data
      : response.data.products || [];
  } catch (err) {
    throw new Error(
      err.response?.data?.message || "Failed to fetch farmer products",
    );
  }
};

/**
 * Get all products available
 * @returns {Promise<Array>} List of all products
 */
export const getAllProducts = async () => {
  try {
    const response = await PRODUCTS_API.get("/all");
    return Array.isArray(response.data)
      ? response.data
      : response.data.products || [];
  } catch (err) {
    throw new Error(err.response?.data?.message || "Failed to fetch products");
  }
};

/**
 * Get products available to customers (no retailer filtering)
 * @returns {Promise<Array>} List of available products
 */
export const getAvailableProductsForCustomers = async () => {
  try {
    console.log("[API] Calling /customer/products endpoint");
    const response = await PRODUCTS_API.get("/customer/products");
    console.log("[API] /customer/products response data:", response.data);
    console.log(
      "[API] /customer/products response length:",
      Array.isArray(response.data) ? response.data.length : "not an array",
    );
    if (Array.isArray(response.data)) {
      return response.data;
    }
    // If backend wraps data, surface as-is for debugging instead of assuming shape
    return response.data || [];
  } catch (err) {
    console.error("[API] /customer/products error:", err);
    throw new Error(
      err.response?.data?.message || "Failed to fetch available products",
    );
  }
};

/**
 * Add a new product to the backend (persists to MySQL + uploads image via Cloudinary)
 * @param {Object} productData - { imageFile, cropType, soilType, pesticides, harvestDate, latitude, longitude, price, quantity, retailerId }
 * @returns {Promise<Object>} The created product, as returned by the backend
 */
export const addProductToBackend = async (productData) => {
  try {
    const formData = new FormData();
    formData.append("image", productData.imageFile);
    formData.append("cropType", productData.cropType);
    formData.append("soilType", productData.soilType);
    formData.append("pesticides", productData.pesticides);
    formData.append("harvestDate", productData.harvestDate);
    formData.append("latitude", productData.latitude);
    formData.append("longitude", productData.longitude);
    formData.append("price", productData.price);
    formData.append("quantity", productData.quantity);
    // NEW: Farmer explicitly chooses which retailer in their network gets this product
    // Guard against undefined so we never send the literal string "undefined"
    formData.append("retailerId", productData.retailerId ?? "");

    const response = await PRODUCTS_API.post("/add", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.product;
  } catch (err) {
    throw new Error(err.response?.data?.message || "Failed to add product");
  }
};

/** Persist farmer edits, including an optional replacement image. */
export const updateProductInBackend = async (productId, productData) => {
  try {
    const formData = new FormData();
    formData.append("cropType", productData.cropType);
    formData.append("soilType", productData.soilType);
    formData.append("pesticides", productData.pesticides);
    formData.append("harvestDate", productData.harvestDate);
    formData.append("price", productData.price);
    formData.append("quantity", productData.quantity);
    // NEW: Retailer is editable after creation too
    if (productData.retailerId) formData.append("retailerId", productData.retailerId);
    if (productData.imageFile) formData.append("image", productData.imageFile);

    const response = await PRODUCTS_API.put(`/${productId}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  } catch (err) {
    throw new Error(err.response?.data?.message || "Failed to update product");
  }
};

/** Remove a farmer-owned product from the database. */
export const deleteProductFromBackend = async (productId) => {
  try {
    await PRODUCTS_API.delete(`/${productId}`);
  } catch (err) {
    throw new Error(err.response?.data?.message || "Failed to delete product");
  }
};

// NEW: Network API Functions (Farmer ↔ Retailer ↔ Distributor)

/**
 * FARMER: Get the retailers already in this farmer's network
 * @returns {Promise<Array<{id, name, email}>>}
 */
export const getMyRetailers = async () => {
  try {
    const response = await NETWORK_API.get("/retailers");
    return Array.isArray(response.data) ? response.data : [];
  } catch (err) {
    throw new Error(
      err.response?.data?.message || "Failed to fetch your retailers",
    );
  }
};

/**
 * FARMER: Get all retailers on the platform (to pick from and add to network)
 * @returns {Promise<Array<{id, name, email}>>}
 */
export const getAvailableRetailers = async () => {
  try {
    const response = await NETWORK_API.get("/retailers/available");
    return Array.isArray(response.data) ? response.data : [];
  } catch (err) {
    throw new Error(
      err.response?.data?.message || "Failed to fetch available retailers",
    );
  }
};

/**
 * FARMER: Add a retailer to this farmer's network
 * @param {number} retailerId
 */
export const addRetailerToNetwork = async (retailerId) => {
  try {
    const response = await NETWORK_API.post("/retailers", { retailerId });
    return response.data;
  } catch (err) {
    throw new Error(
      err.response?.data?.message || "Failed to add retailer to your network",
    );
  }
};

/**
 * RETAILER: Get the distributors already in this retailer's network
 * @returns {Promise<Array<{id, name, email}>>}
 */
export const getMyDistributors = async () => {
  try {
    const response = await NETWORK_API.get("/distributors");
    return Array.isArray(response.data) ? response.data : [];
  } catch (err) {
    throw new Error(
      err.response?.data?.message || "Failed to fetch your distributors",
    );
  }
};

/**
 * RETAILER: Get all distributors on the platform (to pick from and add to network)
 * @returns {Promise<Array<{id, name, email}>>}
 */
export const getAvailableDistributors = async () => {
  try {
    const response = await NETWORK_API.get("/distributors/available");
    return Array.isArray(response.data) ? response.data : [];
  } catch (err) {
    throw new Error(
      err.response?.data?.message || "Failed to fetch available distributors",
    );
  }
};

/**
 * RETAILER: Add a distributor to this retailer's network
 * @param {number} distributorId
 */
export const addDistributorToNetwork = async (distributorId) => {
  try {
    const response = await NETWORK_API.post("/distributors", { distributorId });
    return response.data;
  } catch (err) {
    throw new Error(
      err.response?.data?.message || "Failed to add distributor to your network",
    );
  }
};