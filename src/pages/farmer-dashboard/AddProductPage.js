import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { addProductToBackend, getAvailableRetailers } from "../api";
import "../../styles/addProduct.css";

function AddProductPage({ addProduct }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    cropType: "",
    soilType: "",
    pesticides: "",
    harvestDate: "",
    price: "",
    quantity: "",
    imageFile: null,
    retailerId: "",
  });

  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Every retailer account on the platform — farmer assigns this product to any of them directly
  const [availableRetailers, setAvailableRetailers] = useState([]);
  const [retailersLoading, setRetailersLoading] = useState(true);

  useEffect(() => {
    const loadRetailers = async () => {
      setRetailersLoading(true);
      try {
        const retailers = await getAvailableRetailers();
        setAvailableRetailers(retailers);
      } catch (err) {
        console.error("Failed to load retailers:", err);
        setAvailableRetailers([]);
      } finally {
        setRetailersLoading(false);
      }
    };

    loadRetailers();
  }, []);

  const validateForm = () => {
    const newErrors = {};
    if (!form.cropType.trim()) newErrors.cropType = "Crop type is required";
    if (!form.soilType.trim()) newErrors.soilType = "Soil type is required";
    if (!form.pesticides.trim())
      newErrors.pesticides = "Pesticides info required";
    if (!form.harvestDate) newErrors.harvestDate = "Harvest date is required";
    if (!form.price || Number(form.price) <= 0)
      newErrors.price = "Enter a valid price";
    if (!form.quantity || Number(form.quantity) <= 0)
      newErrors.quantity = "Enter a valid quantity";
    if (!form.imageFile) newErrors.image = "Product image is required";
    // NEW: Retailer selection is mandatory — backend enforces this too
    if (!form.retailerId) newErrors.retailerId = "Please select a retailer";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));

    if (name === "image" && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result; // base64 persists in localStorage
        setForm({ ...form, imageFile: file });
        setImagePreview(dataUrl);
      };
      reader.readAsDataURL(file);
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const lat = (Math.random() * 180 - 90).toFixed(6);
      const lng = (Math.random() * 360 - 180).toFixed(6);

      const savedProduct = await addProductToBackend({
        imageFile: form.imageFile,
        cropType: form.cropType,
        soilType: form.soilType,
        pesticides: form.pesticides,
        harvestDate: form.harvestDate,
        latitude: lat,
        longitude: lng,
        price: form.price,
        quantity: form.quantity,
        retailerId: form.retailerId,
      });

      // Keep local state in sync too, in case the dashboard doesn't refetch immediately
      if (addProduct) {
        addProduct(savedProduct);
      }
      navigate("/farmer-dashboard");
    } catch (error) {
      console.error("Failed to save product:", error);
      setErrors((prev) => ({
        ...prev,
        submit: error.message || "Failed to save product. Please try again.",
      }));
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate("/farmer-dashboard");
  };

  return (
    <div className="add-product-page">
      <div className="form-container">
        <div className="form-header">
          <h1>Add New Product</h1>
          <p>Capture crop details for full traceability.</p>
        </div>

        <div className="form-card">
          <form onSubmit={handleSubmit} className="form-section">
            {/* Retailer selection — farmer assigns this product to any registered retailer */}
            <div className="form-section">
              <div className="form-group">
                <label className="required" htmlFor="retailerId">
                  Retailer
                </label>

                {retailersLoading ? (
                  <p className="form-help">Loading retailers...</p>
                ) : (
                  <select
                    id="retailerId"
                    name="retailerId"
                    value={form.retailerId}
                    onChange={handleChange}
                    className={errors.retailerId ? "error" : ""}
                  >
                    <option value="">Select a retailer</option>
                    {availableRetailers.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.email})
                      </option>
                    ))}
                  </select>
                )}

                {errors.retailerId && (
                  <span className="error-text">{errors.retailerId}</span>
                )}

                {!retailersLoading && availableRetailers.length === 0 && (
                  <p className="form-help">No retailer accounts exist yet.</p>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="cropType" className="required">
                  Crop Type
                </label>
                <input
                  type="text"
                  id="cropType"
                  name="cropType"
                  value={form.cropType}
                  onChange={handleChange}
                  className={errors.cropType ? "error" : ""}
                  placeholder="e.g., Organic Rice, Wheat, Corn"
                />
                {errors.cropType && (
                  <span className="error-text">{errors.cropType}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="soilType" className="required">
                  Soil Type
                </label>
                <input
                  type="text"
                  id="soilType"
                  name="soilType"
                  value={form.soilType}
                  onChange={handleChange}
                  className={errors.soilType ? "error" : ""}
                  placeholder="e.g., Black Soil, Loamy Soil"
                />
                {errors.soilType && (
                  <span className="error-text">{errors.soilType}</span>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="pesticides" className="required">
                  Pesticides Used
                </label>
                <input
                  type="text"
                  id="pesticides"
                  name="pesticides"
                  value={form.pesticides}
                  onChange={handleChange}
                  className={errors.pesticides ? "error" : ""}
                  placeholder="e.g., Neem Oil, Pyrethroids"
                />
                {errors.pesticides && (
                  <span className="error-text">{errors.pesticides}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="harvestDate" className="required">
                  Harvest Date
                </label>
                <input
                  type="date"
                  id="harvestDate"
                  name="harvestDate"
                  value={form.harvestDate}
                  onChange={handleChange}
                  className={errors.harvestDate ? "error" : ""}
                />
                {errors.harvestDate && (
                  <span className="error-text">{errors.harvestDate}</span>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="price" className="required">
                  Price (per kg)
                </label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={handleChange}
                  className={errors.price ? "error" : ""}
                  placeholder="e.g., 2.50"
                />
                {errors.price && (
                  <span className="error-text">{errors.price}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="quantity" className="required">
                  Quantity (kg)
                </label>
                <input
                  type="number"
                  id="quantity"
                  name="quantity"
                  min="0"
                  step="1"
                  value={form.quantity}
                  onChange={handleChange}
                  className={errors.quantity ? "error" : ""}
                  placeholder="e.g., 100"
                />
                {errors.quantity && (
                  <span className="error-text">{errors.quantity}</span>
                )}
              </div>
            </div>

            <div className="form-section">
              <div className="form-group">
                <label className="image-upload-area" htmlFor="image">
                  <div className="upload-icon">📷</div>
                  <h3>Click to upload</h3>
                  <p>
                    High-quality field photo helps buyers trust the product.
                  </p>
                </label>
                <input
                  type="file"
                  id="image"
                  name="image"
                  accept="image/*"
                  onChange={handleChange}
                  className="file-input"
                />
                {imagePreview && (
                  <div className="image-preview">
                    <img
                      className="preview-image"
                      src={imagePreview}
                      alt="Preview"
                    />
                  </div>
                )}
                {errors.image && (
                  <span className="error-text">{errors.image}</span>
                )}
              </div>
            </div>

            {errors.submit && (
              <div className="error-text" style={{ marginBottom: "1rem" }}>
                {errors.submit}
              </div>
            )}

            <div className="form-actions">
              <button
                type="submit"
                className="btn-submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save Product"}
              </button>
              <button
                type="button"
                className="btn-cancel"
                onClick={handleBack}
                disabled={isSubmitting}
              >
                Back
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AddProductPage;
