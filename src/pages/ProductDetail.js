import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import "../styles/ProductDetail.css";

function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const response = await axiosInstance.get(`/api/products/${id}`);
        setProduct(response.data);
      } catch (err) {
        setError(err.message || "Product not found");
      }
    };

    loadProduct();
  }, [id]);

  if (error) {
    return <div className="product-detail-error">{error}</div>;
  }

  if (!product) {
    return <div className="product-detail-error">Loading product...</div>;
  }

  return (
    <div className="product-detail">
      <div className="product-detail-card">
        <h1>{product.cropType}</h1>

        <div className="product-image">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.cropType} />
          ) : (
            <div className="no-image">No Image Available</div>
          )}
        </div>

        <div className="product-info">
          <div className="info-row">
            <span className="label">Soil Type</span>
            <span className="value">{product.soilType}</span>
          </div>
          <div className="info-row">
            <span className="label">Pesticides</span>
            <span className="value">{product.pesticides}</span>
          </div>
          <div className="info-row">
            <span className="label">Harvest Date</span>
            <span className="value">{product.harvestDate}</span>
          </div>
          <div className="info-row">
            <span className="label">Location</span>
            <span className="value">
              {product.latitude}, {product.longitude}
              <a
                href={`https://www.google.com/maps?q=${product.latitude},${product.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="map-link"
              >
                View on Map
              </a>
            </span>
          </div>
        </div>

        <div className="verification-badge">Verified Product - Trusted Source</div>
      </div>
    </div>
  );
}

export default ProductDetail;
