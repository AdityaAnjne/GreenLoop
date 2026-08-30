import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAvailableRetailers } from "../api";
import "../../styles/editProduct.css";

function EditProductPage({ products, onUpdateProduct }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const productToEdit = products.find((p) => p.id.toString() === id);

  const [form, setForm] = useState({
    cropType: "",
    soilType: "",
    pesticides: "",
    harvestDate: "",
    price: "",
    quantity: "",
    imageFile: null,
    imageUrl: "",
    retailerId: "",
  });

  const [imagePreview, setImagePreview] = useState("");

  // Every retailer account on the platform — farmer can reassign this product to any of them
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

  useEffect(() => {
    if (productToEdit) {
      setForm({
        cropType: productToEdit.cropType,
        soilType: productToEdit.soilType,
        pesticides: productToEdit.pesticides,
        harvestDate: productToEdit.harvestDate,
        price: productToEdit.price ?? "",
        quantity: productToEdit.quantity ?? "",
        imageFile: null,
        imageUrl: productToEdit.imageUrl,
        retailerId: productToEdit.retailerId ? String(productToEdit.retailerId) : "",
      });
      setImagePreview(productToEdit.imageUrl);
    }
  }, [productToEdit]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "image" && files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
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
    try {
      await onUpdateProduct(Number(id), form);
      alert("Product updated successfully!");
      navigate("/farmer-dashboard");
    } catch (err) {
      console.error("Failed to update product:", err);
      alert(err.message || "Could not save changes. Your product was not updated.");
    }
  };

  if (!productToEdit)
    return <div className="add-container">Product not found.</div>;

  return (
    <div className="edit-product-page">
      <div className="form-container">
        <div className="form-header">
          <h1>Edit Product</h1>
          <p>Update your crop details and image.</p>
        </div>

        <div className="form-card">
          <form onSubmit={handleSubmit} className="form-section">
            {/* Retailer selection — editable after creation */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="retailerId" className="required">
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
                  >
                    <option value="">Select a retailer</option>
                    {availableRetailers.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.email})
                      </option>
                    ))}
                  </select>
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
                />
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
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="pesticides" className="required">
                  Pesticides
                </label>
                <input
                  type="text"
                  id="pesticides"
                  name="pesticides"
                  value={form.pesticides}
                  onChange={handleChange}
                />
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
                />
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
                  placeholder="e.g., 2.50"
                />
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
                  placeholder="e.g., 100"
                />
              </div>
            </div>

            <div className="form-section">
              <div className="form-group">
                <label className="image-upload-area" htmlFor="image">
                  <div className="upload-icon">📷</div>
                  <h3>Click to upload</h3>
                  <p>Add a clear product photo to build trust.</p>
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
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-submit">
                Save Changes
              </button>
              <button
                type="button"
                className="btn-cancel"
                onClick={() => navigate("/farmer-dashboard")}
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

export default EditProductPage;