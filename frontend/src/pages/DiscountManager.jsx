import { useState, useEffect } from "react";
import { useToast } from "../components/ToastContainer";
import "./DiscountManager.css";

export default function DiscountManager() {
  const { showSuccess, showError } = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [discountPercentage, setDiscountPercentage] = useState("");
  const [filter, setFilter] = useState("all"); // all, on_sale, not_on_sale

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8000/api/products/");
      if (!response.ok) throw new Error("Failed to load products");

      const data = await response.json();
      setProducts(data.results || data);
    } catch (error) {
      showError(error.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  function toggleProductSelection(productId) {
    setSelectedProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  }

  function selectAll() {
    const filteredIds = getFilteredProducts().map((p) => p.id);
    setSelectedProducts(filteredIds);
  }

  function deselectAll() {
    setSelectedProducts([]);
  }

  async function applyDiscount() {
    if (selectedProducts.length === 0) {
      showError("Please select at least one product");
      return;
    }

    const discount = parseFloat(discountPercentage);
    if (isNaN(discount) || discount < 0 || discount > 100) {
      showError("Please enter a valid discount between 0 and 100");
      return;
    }

    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        "http://localhost:8000/api/products/discount/apply/",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            product_ids: selectedProducts,
            discount_percentage: discount,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to apply discount");
      }

      const data = await response.json();
      showSuccess(
        `${data.message}. Notifying ${selectedProducts.length} wishlist users!`
      );

      // Reload products
      await loadProducts();
      setSelectedProducts([]);
      setDiscountPercentage("");
    } catch (error) {
      showError(error.message || "Failed to apply discount");
    }
  }

  async function removeDiscount() {
    if (selectedProducts.length === 0) {
      showError("Please select at least one product");
      return;
    }

    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        "http://localhost:8000/api/products/discount/remove/",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            product_ids: selectedProducts,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove discount");
      }

      const data = await response.json();
      showSuccess(data.message);

      // Reload products
      await loadProducts();
      setSelectedProducts([]);
    } catch (error) {
      showError(error.message || "Failed to remove discount");
    }
  }

  function getFilteredProducts() {
    switch (filter) {
      case "on_sale":
        return products.filter((p) => p.is_on_sale);
      case "not_on_sale":
        return products.filter((p) => !p.is_on_sale);
      default:
        return products;
    }
  }

  const filteredProducts = getFilteredProducts();

  if (loading) {
    return (
      <div className="discount-manager">
        <h1>Discount Manager</h1>
        <p>Loading products...</p>
      </div>
    );
  }

  return (
    <div className="discount-manager">
      <div className="discount-header">
        <div>
          <h1>Discount Manager</h1>
          <p className="subtitle">
            Apply discounts to products and notify wishlist users
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="discount-controls">
        <div className="filter-section">
          <label>Filter:</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All Products ({products.length})</option>
            <option value="on_sale">
              On Sale ({products.filter((p) => p.is_on_sale).length})
            </option>
            <option value="not_on_sale">
              Not On Sale ({products.filter((p) => !p.is_on_sale).length})
            </option>
          </select>
        </div>

        <div className="selection-controls">
          <button onClick={selectAll} className="btn-secondary">
            Select All ({filteredProducts.length})
          </button>
          <button onClick={deselectAll} className="btn-secondary">
            Deselect All
          </button>
          <span className="selected-count">
            {selectedProducts.length} selected
          </span>
        </div>
      </div>

      {/* Apply Discount Section */}
      <div className="discount-actions">
        <div className="action-card">
          <h3>Apply Discount</h3>
          <div className="action-form">
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={discountPercentage}
              onChange={(e) => setDiscountPercentage(e.target.value)}
              placeholder="Enter discount %"
            />
            <button
              onClick={applyDiscount}
              className="btn-apply"
              disabled={selectedProducts.length === 0}
            >
              Apply Discount
            </button>
          </div>
          <p className="help-text">
            ✉️ Wishlist users will be notified via email
          </p>
        </div>

        <div className="action-card">
          <h3>Remove Discount</h3>
          <div className="action-form">
            <button
              onClick={removeDiscount}
              className="btn-remove"
              disabled={selectedProducts.length === 0}
            >
              Remove Discount
            </button>
          </div>
          <p className="help-text">Set discount to 0% for selected products</p>
        </div>
      </div>

      {/* Products Table */}
      <div className="products-table-container">
        <table className="products-table">
          <thead>
            <tr>
              <th>Select</th>
              <th>Product</th>
              <th>Original Price</th>
              <th>Discount</th>
              <th>Sale Price</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => (
              <tr
                key={product.id}
                className={
                  selectedProducts.includes(product.id) ? "selected" : ""
                }
              >
                <td>
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(product.id)}
                    onChange={() => toggleProductSelection(product.id)}
                  />
                </td>
                <td>
                  <div className="product-cell">
                    <strong>{product.name}</strong>
                    <span className="product-id">ID: {product.id}</span>
                  </div>
                </td>
                <td className="price-cell">${product.price}</td>
                <td className="discount-cell">
                  {product.is_on_sale ? (
                    <span className="discount-badge">
                      {product.discount_percentage}% OFF
                    </span>
                  ) : (
                    <span className="no-discount">—</span>
                  )}
                </td>
                <td className="price-cell">
                  {product.is_on_sale ? (
                    <span className="sale-price">
                      ${product.discounted_price.toFixed(2)}
                    </span>
                  ) : (
                    <span>${product.price}</span>
                  )}
                </td>
                <td>
                  {product.is_on_sale ? (
                    <span className="status-badge status-sale">On Sale</span>
                  ) : (
                    <span className="status-badge status-regular">Regular</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
