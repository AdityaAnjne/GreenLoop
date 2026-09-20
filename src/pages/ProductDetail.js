import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import "../styles/ProductDetail.css";

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

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
    return (
      <div className="product-detail-page">
        <div className="detail-container">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-detail-page">
        <div className="detail-container">
          <p>Loading product...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="product-detail-page">
      <div className="detail-container">

        <button
          className="back-button"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>

        <div className="product-detail-card">

          <div className="product-main">

            <div className="product-image-section">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.cropType}
                  className="product-image-large"
                />
              ) : (
                <div className="product-image-large" />
              )}
            </div>

            <div className="product-info-section">

              <h1>{product.cropType}</h1>

              <div className="product-meta">
                <span className="meta-badge">
                  Verified Product
                </span>

                <span className="meta-badge">
                  Trusted Source
                </span>
              </div>

              <div className="product-details-grid">

                <div className="detail-item">
                  <span className="detail-label">
                    Soil Type
                  </span>

                  <span className="detail-value">
                    {product.soilType || "—"}
                  </span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">
                    Pesticides
                  </span>

                  <span className="detail-value">
                    {product.pesticides || "—"}
                  </span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">
                    Harvest Date
                  </span>

                  <span className="detail-value">
                    {product.harvestDate || "—"}
                  </span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">
                    Location
                  </span>

                  <span className="detail-value">
                    {product.latitude != null &&
                    product.longitude != null ? (
                      <a
                        href={`https://www.google.com/maps?q=${product.latitude},${product.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {product.latitude.toFixed(4)},{" "}
                        {product.longitude.toFixed(4)}
                        {" · View on Map"}
                      </a>
                    ) : (
                      "Not available"
                    )}
                  </span>
                </div>

                {product.qualityScore != null && (
                  <div className="detail-item">
                    <span className="detail-label">
                      AI Quality Score
                    </span>

                    <span className="detail-value">
                      {product.qualityScore.toFixed(1)} / 5.0
                    </span>
                  </div>
                )}

              </div>

              {product.qualityAnalysis && (
                <div className="product-description">
                  <h3>AI Quality Analysis</h3>
                  <p>{product.qualityAnalysis}</p>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default ProductDetail;