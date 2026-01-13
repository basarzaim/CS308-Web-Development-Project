// src/pages/StockManager.jsx
import { useEffect, useState } from "react";
import { useToast } from "../components/ToastContainer";
import { getProducts } from "../services/products";
import { updateProductStock } from "../api/products";
import "./StockManager.css";

export default function StockManager() {
  const { showSuccess, showError } = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [stockFilter, setStockFilter] = useState("all"); // all, low, out
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const [editingStock, setEditingStock] = useState("");

  const LOW_STOCK_THRESHOLD = 10;

  useEffect(() => {
    loadProducts();
  }, [page, search, category, stockFilter]);

  async function loadProducts() {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: 20,
        search: search || undefined,
        category: category || undefined,
      };

      // Apply stock filter
      if (stockFilter === "out") {
        params.in_stock = "false";
      } else if (stockFilter === "low") {
        // We'll filter client-side for low stock since backend doesn't have this filter
        params.in_stock = "true";
      }

      const data = await getProducts(params);
      let items = data.results || data || [];

      // Client-side filter for low stock
      if (stockFilter === "low") {
        items = items.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD);
      }

      setProducts(items);
      setTotalPages(Math.ceil((data.count || items.length) / 20));
    } catch (err) {
      console.error("Failed to load products:", err);
      showError("Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  function handleEditClick(product) {
    setEditingId(product.id);
    setEditingStock(String(product.stock));
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditingStock("");
  }

  async function handleSaveStock(productId) {
    const newStock = parseInt(editingStock);
    if (isNaN(newStock) || newStock < 0) {
      showError("Please enter a valid stock quantity");
      return;
    }

    try {
      await updateProductStock(productId, newStock);
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, stock: newStock } : p))
      );
      setEditingId(null);
      setEditingStock("");
      showSuccess("Stock updated successfully");
    } catch (err) {
      console.error("Failed to update stock:", err);
      showError(err.response?.data?.error || "Failed to update stock");
    }
  }

  function getStockStatus(stock) {
    if (stock === 0) return { label: "Out of Stock", className: "out" };
    if (stock <= LOW_STOCK_THRESHOLD) return { label: "Low Stock", className: "low" };
    return { label: "In Stock", className: "ok" };
  }

  return (
    <div className="stock-manager-page">
      <div className="stock-manager-container">
        <header className="stock-manager-header">
          <h1>Stock Management</h1>
          <p className="stock-manager-subtitle">
            Manage product inventory and stock levels
          </p>
        </header>

        {/* Filters */}
        <div className="stock-filters">
          <div className="stock-filter-group">
            <label>Search Products</label>
            <input
              type="text"
              placeholder="Search by name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="stock-search-input"
            />
          </div>

          <div className="stock-filter-group">
            <label>Category</label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="stock-select"
            >
              <option value="">All Categories</option>
              <option value="phones">Phones</option>
              <option value="laptops">Laptops & Ultrabooks</option>
              <option value="tablets">Tablets & E-Readers</option>
              <option value="desktops">Desktops & All-in-Ones</option>
              <option value="monitors">Monitors</option>
              <option value="components">PC Components</option>
              <option value="peripherals">Keyboards, Mice & Input</option>
              <option value="networking">Networking & Modems</option>
              <option value="audio">Headphones & Speakers</option>
              <option value="tv_video">TV & Video</option>
              <option value="gaming">Gaming Consoles & Accessories</option>
              <option value="smart_home">Smart Home</option>
              <option value="wearables">Wearables</option>
              <option value="storage">External Storage & SSD/HDD</option>
              <option value="printers">Printers & Scanners</option>
              <option value="accessories">Cables & Accessories</option>
              <option value="drones">Drones</option>
              <option value="photo_video">Cameras & Photo</option>
            </select>
          </div>

          <div className="stock-filter-group">
            <label>Stock Status</label>
            <select
              value={stockFilter}
              onChange={(e) => {
                setStockFilter(e.target.value);
                setPage(1);
              }}
              className="stock-select"
            >
              <option value="all">All Products</option>
              <option value="low">Low Stock (≤{LOW_STOCK_THRESHOLD})</option>
              <option value="out">Out of Stock</option>
            </select>
          </div>
        </div>

        {/* Products Table */}
        {loading ? (
          <div className="stock-loading">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="stock-empty">
            <p>No products found</p>
          </div>
        ) : (
          <>
            <div className="stock-table-container">
              <table className="stock-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Product Name</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Current Stock</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const status = getStockStatus(product.stock);
                    const isEditing = editingId === product.id;

                    return (
                      <tr key={product.id} className={`stock-row status-${status.className}`}>
                        <td className="stock-id">#{product.id}</td>
                        <td className="stock-name">{product.name}</td>
                        <td className="stock-category">
                          {product.category ? (
                            <span className="category-badge">
                              {product.category.replace("_", " ")}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="stock-price">${Number(product.price).toFixed(2)}</td>
                        <td className="stock-quantity">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              value={editingStock}
                              onChange={(e) => setEditingStock(e.target.value)}
                              className="stock-input-edit"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveStock(product.id);
                                if (e.key === "Escape") handleCancelEdit();
                              }}
                            />
                          ) : (
                            <span className="stock-amount">{product.stock}</span>
                          )}
                        </td>
                        <td className="stock-status">
                          <span className={`status-badge ${status.className}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="stock-actions">
                          {isEditing ? (
                            <>
                              <button
                                className="btn-save"
                                onClick={() => handleSaveStock(product.id)}
                              >
                                ✓ Save
                              </button>
                              <button className="btn-cancel" onClick={handleCancelEdit}>
                                ✕ Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              className="btn-edit"
                              onClick={() => handleEditClick(product)}
                            >
                              ✎ Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="stock-pagination">
                <button
                  className="btn-page"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  ‹ Previous
                </button>
                <span className="page-info">
                  Page {page} of {totalPages}
                </span>
                <button
                  className="btn-page"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next ›
                </button>
              </div>
            )}
          </>
        )}

        {/* Stock Summary */}
        <div className="stock-summary">
          <div className="summary-card">
            <div className="summary-icon">📦</div>
            <div className="summary-content">
              <div className="summary-label">Total Products</div>
              <div className="summary-value">{products.length}</div>
            </div>
          </div>
          <div className="summary-card low">
            <div className="summary-icon">⚠️</div>
            <div className="summary-content">
              <div className="summary-label">Low Stock</div>
              <div className="summary-value">
                {products.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD).length}
              </div>
            </div>
          </div>
          <div className="summary-card out">
            <div className="summary-icon">❌</div>
            <div className="summary-content">
              <div className="summary-label">Out of Stock</div>
              <div className="summary-value">
                {products.filter((p) => p.stock === 0).length}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
