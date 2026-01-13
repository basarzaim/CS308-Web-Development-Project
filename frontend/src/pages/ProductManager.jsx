import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { isProductManager } from "../utils/admin";
import "./ProductManager.css";

export default function ProductManager() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("products");

  // Product Management State
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState("");

  // Category Management State
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState("");

  // Delivery Lists State
  const [deliveries, setDeliveries] = useState([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);
  const [deliveriesError, setDeliveriesError] = useState("");

  // Invoice Viewing State
  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoicesError, setInvoicesError] = useState("");

  // Date filters for invoices
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Memoize load functions to prevent stale closures and ensure they're available
  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    setProductsError("");
    try {
      const { fetchProducts } = await import("../api/products");
      const data = await fetchProducts({ page: 1, limit: 200 });
      setProducts(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      console.error("Error loading products:", err);
      const errorMessage = err?.response?.data?.detail || 
                          err?.response?.data?.message || 
                          err?.message || 
                          "Failed to load products";
      setProductsError(errorMessage);
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    setCategoriesError("");
    try {
      const { fetchCategories } = await import("../api/products");
      const data = await fetchCategories();
      if (Array.isArray(data)) {
        setCategories(data);
      } else if (data && Array.isArray(data.results)) {
        setCategories(data.results);
      } else if (data && Array.isArray(data.items)) {
        setCategories(data.items);
      } else {
        setCategories([]);
      }
    } catch (err) {
      console.error("Error loading categories:", err);
      setCategoriesError(err.message || "Failed to load categories");
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  const loadDeliveries = useCallback(async () => {
    setDeliveriesLoading(true);
    setDeliveriesError("");
    try {
      const { fetchAllOrders } = await import("../api/orders");
      const allOrders = await fetchAllOrders();
      // Show ALL orders regardless of status (delivered, in-transit, processing, returned, etc.)
      const deliveryOrders = Array.isArray(allOrders) ? allOrders : [];
      console.log("All orders loaded:", deliveryOrders.length);
      setDeliveries(deliveryOrders);
    } catch (err) {
      console.error("Error loading deliveries:", err);
      const errorMessage = err?.response?.data?.detail || 
                          err?.response?.data?.message || 
                          err?.message || 
                          "Failed to load delivery lists";
      setDeliveriesError(errorMessage);
      setDeliveries([]);
    } finally {
      setDeliveriesLoading(false);
    }
  }, []);

  const loadInvoices = useCallback(async () => {
    if (!fromDate || !toDate) return;

    setInvoicesLoading(true);
    setInvoicesError("");
    try {
      const { fetchAllOrders } = await import("../api/orders");
      const allOrders = await fetchAllOrders();

      const filteredInvoices = Array.isArray(allOrders)
        ? allOrders.filter(order => {
            try {
              const orderDate = new Date(order.created_at);
              const from = new Date(fromDate);
              const to = new Date(toDate);
              to.setHours(23, 59, 59);
              return orderDate >= from && orderDate <= to &&
                     (order.status === "delivered" || order.status === "completed");
            } catch (dateErr) {
              console.error("Error parsing date in invoice filter:", dateErr);
              return false;
            }
          })
        : [];

      setInvoices(filteredInvoices);
    } catch (err) {
      console.error("Error loading invoices:", err);
      const errorMessage = err?.response?.data?.detail || 
                          err?.response?.data?.message || 
                          err?.message || 
                          "Failed to load invoices";
      setInvoicesError(errorMessage);
      setInvoices([]);
    } finally {
      setInvoicesLoading(false);
    }
  }, [fromDate, toDate]);

  // Load products data
  useEffect(() => {
    if (activeTab === "products" && !authLoading && user) {
      loadProducts().catch(err => {
        console.error("Error in loadProducts useEffect:", err);
        setProductsError(err.message || "Failed to load products");
      });
    }
  }, [activeTab, authLoading, user, loadProducts]);

  // Load categories data
  useEffect(() => {
    if (activeTab === "categories" && !authLoading && user) {
      loadCategories().catch(err => {
        console.error("Error in loadCategories useEffect:", err);
        setCategoriesError(err.message || "Failed to load categories");
      });
    }
  }, [activeTab, authLoading, user, loadCategories]);

  // Load deliveries data
  useEffect(() => {
    if (activeTab === "deliveries" && !authLoading && user) {
      loadDeliveries().catch(err => {
        console.error("Error in loadDeliveries useEffect:", err);
        setDeliveriesError(err.message || "Failed to load delivery lists");
      });
    }
  }, [activeTab, authLoading, user, loadDeliveries]);

  // Load invoices data
  useEffect(() => {
    if (activeTab === "invoices" && fromDate && toDate && !authLoading && user) {
      loadInvoices().catch(err => {
        console.error("Error in loadInvoices useEffect:", err);
        setInvoicesError(err.message || "Failed to load invoices");
      });
    }
  }, [activeTab, fromDate, toDate, authLoading, user, loadInvoices]);

  if (authLoading) {
    return <div style={{ padding: 24 }}>Loading...</div>;
  }

  // Check if user is authenticated and is Product Manager
  if (!user) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{
          color: "#856404",
          backgroundColor: "#fff3cd",
          border: "1px solid #ffeaa7",
          borderRadius: "4px",
          padding: "12px",
          marginBottom: "16px"
        }}>
          Please log in to access Product Manager features.
        </div>
      </div>
    );
  }

  if (!isProductManager(user)) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{
          color: "#dc3545",
          backgroundColor: "#f8d7da",
          border: "1px solid #f5c6cb",
          borderRadius: "4px",
          padding: "12px",
          marginBottom: "16px"
        }}>
          Access denied. Product Manager role required.
        </div>
      </div>
    );
  }

  const handleDeleteProduct = async (productId) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const { deleteProduct } = await import("../api/products");
      await deleteProduct(productId);
      setProducts(products.filter(p => p.id !== productId));
    } catch (err) {
      alert("Failed to delete product: " + err.message);
    }
  };

  const handleUpdateStock = async (productId, newStock) => {
    try {
      const { updateProduct } = await import("../api/products");
      await updateProduct(productId, { stock: newStock });
      setProducts(products.map(p =>
        p.id === productId ? { ...p, stock: newStock } : p
      ));
    } catch (err) {
      alert("Failed to update stock: " + err.message);
    }
  };

  const handleAddCategory = async () => {
    const categoryName = prompt("Enter new category name:");
    if (!categoryName) return;

    const categorySlug = prompt("Enter category slug (lowercase, no spaces):");
    if (!categorySlug) return;

    const description = prompt("Enter category description (optional):") || "";

    try {
      const { createCategory } = await import("../api/products");
      const result = await createCategory({
        name: categoryName,
        slug: categorySlug,
        description: description
      });
      
      if (result) {
        setTimeout(() => {
          loadCategories().catch(err => {
            console.error("Error refreshing categories after creation:", err);
            setCategoriesError("Category created but failed to refresh list. Please refresh the page.");
          });
        }, 100);
      }
    } catch (err) {
      console.error("Error creating category:", err);
      const errorMessage = err?.response?.data?.detail || 
                          err?.response?.data?.message || 
                          err?.message || 
                          "Failed to add category";
      alert("Failed to add category: " + errorMessage);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!confirm("Are you sure you want to delete this category? This will fail if the category contains products.")) return;

    try {
      const { deleteCategory } = await import("../api/products");
      await deleteCategory(categoryId);
      setTimeout(() => {
        loadCategories().catch(err => {
          console.error("Error refreshing categories after deletion:", err);
          setCategoriesError("Category deleted but failed to refresh list. Please refresh the page.");
        });
      }, 100);
    } catch (err) {
      console.error("Error deleting category:", err);
      const errorMessage = err?.response?.data?.detail || 
                          err?.response?.data?.message || 
                          err?.message || 
                          "Failed to delete category";
      alert("Failed to delete category: " + errorMessage);
    }
  };

  const handleDownloadInvoice = async (orderId) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        alert('Please log in to download invoices');
        return;
      }

      const response = await fetch(`http://localhost:8000/api/orders/${orderId}/download-invoice/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download invoice');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice_${orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert('Invoice downloaded successfully!');
    } catch (err) {
      console.error('Error downloading invoice:', err);
      alert('Failed to download invoice. Please try again.');
    }
  };

  const tabs = [
    { id: "products", label: "Product Management", icon: "📦" },
    { id: "categories", label: "Category Management", icon: "🏷️" },
    { id: "deliveries", label: "Delivery Lists", icon: "🚚" },
    { id: "invoices", label: "Invoice Viewing", icon: "📄" },
  ];

  return (
    <div className="pm-container">
      <header className="pm-header">
        <div>
          <h1>Product Manager Dashboard</h1>
          <p className="pm-description">
            Manage products, categories, deliveries, and view invoices
          </p>
        </div>
      </header>

      <nav className="pm-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`pm-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="pm-content">
        {activeTab === "products" && (
          <ProductManagement
            products={products}
            loading={productsLoading}
            error={productsError}
            onDeleteProduct={handleDeleteProduct}
            onUpdateStock={handleUpdateStock}
            onRefresh={loadProducts}
          />
        )}

        {activeTab === "categories" && (
          <CategoryManagement
            categories={categories}
            loading={categoriesLoading}
            error={categoriesError}
            onAddCategory={handleAddCategory}
            onDeleteCategory={handleDeleteCategory}
            onRefresh={loadCategories}
          />
        )}

        {activeTab === "deliveries" && (
          <DeliveryLists
            deliveries={deliveries}
            loading={deliveriesLoading}
            error={deliveriesError}
            onRefresh={loadDeliveries}
          />
        )}

        {activeTab === "invoices" && (
          <InvoiceViewing
            invoices={invoices}
            loading={invoicesLoading}
            error={invoicesError}
            fromDate={fromDate}
            toDate={toDate}
            onFromDateChange={setFromDate}
            onToDateChange={setToDate}
            onDownloadInvoice={handleDownloadInvoice}
          />
        )}
      </main>
    </div>
  );
}

function ProductManagement({ products, loading, error, onDeleteProduct, onUpdateStock, onRefresh }) {
  const [editingStock, setEditingStock] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addingProduct, setAddingProduct] = useState(false);
  const [addError, setAddError] = useState("");

  if (loading) return <div className="pm-loading">Loading products...</div>;
  if (error) return <div className="pm-error">{error}</div>;

  const handleAddProduct = async (productData) => {
    setAddingProduct(true);
    setAddError("");
    try {
      const { createProduct } = await import("../api/products");
      await createProduct(productData);
      setShowAddForm(false);
      onRefresh();
    } catch (err) {
      setAddError(err.message || "Failed to create product");
    } finally {
      setAddingProduct(false);
    }
  };

  return (
    <div className="pm-section">
      <div className="pm-section-header">
        <h2>Product Management</h2>
        <div className="pm-section-actions">
          <button onClick={() => setShowAddForm(true)} className="pm-add-btn">Add Product</button>
          <button onClick={onRefresh} className="pm-refresh-btn">Refresh</button>
        </div>
      </div>

      {showAddForm && (
        <AddProductForm
          onClose={() => {
            setShowAddForm(false);
            setAddError("");
          }}
          onAdd={handleAddProduct}
          loading={addingProduct}
          error={addError}
        />
      )}

      {products.length === 0 ? (
        <p className="pm-empty">No products found.</p>
      ) : (
        <div className="pm-products-grid">
          {products.map((product) => (
            <div key={product.id} className="pm-product-card">
              <div className="pm-product-image">
                {product.image ? (
                  <img src={product.image} alt={product.name} />
                ) : (
                  <div className="pm-product-placeholder">No Image</div>
                )}
              </div>

              <div className="pm-product-info">
                <h3>{product.name}</h3>
                <p className="pm-product-price">${Number(product.price || 0).toFixed(2)}</p>
                <p className="pm-product-category">{product.category || "No category"}</p>
              </div>

              <div className="pm-product-actions">
                <div className="pm-stock-control">
                  <label>Stock:</label>
                  {editingStock === product.id ? (
                    <input
                      type="number"
                      min="0"
                      value={product.stock || 0}
                      onChange={(e) => {
                        const newStock = parseInt(e.target.value) || 0;
                        onUpdateStock(product.id, newStock);
                        setEditingStock(null);
                      }}
                      onBlur={() => setEditingStock(null)}
                      autoFocus
                    />
                  ) : (
                    <span
                      className={`pm-stock-value ${product.stock === 0 ? 'out-of-stock' : ''}`}
                      onClick={() => setEditingStock(product.id)}
                    >
                      {product.stock || 0}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => onDeleteProduct(product.id)}
                  className="pm-delete-btn"
                >
                  Delete Product
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddProductForm({ onClose, onAdd, loading, error }) {
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    stock: "0",
    warranty: "0",
    description: "",
    model: "",
    serial_number: "",
    distributor: "",
    category: "",
  });
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  useEffect(() => {
    async function loadCategories() {
      try {
        const { fetchCategories } = await import("../api/products");
        const data = await fetchCategories();
        setCategories(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load categories:", err);
      } finally {
        setCategoriesLoading(false);
      }
    }
    loadCategories();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const productData = {
      name: formData.name.trim(),
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock) || 0,
      warranty: parseInt(formData.warranty) || 0,
      description: formData.description.trim() || null,
      model: formData.model.trim() || "",
      serial_number: formData.serial_number.trim() || null,
      distributor: formData.distributor.trim() || "",
    };

    if (formData.category) {
      const categoryId = parseInt(formData.category);
      if (!isNaN(categoryId)) {
        productData.category = categoryId;
      }
    }

    if (!productData.name) {
      alert("Product name is required");
      return;
    }

    if (!productData.price || productData.price <= 0) {
      alert("Valid price is required");
      return;
    }

    await onAdd(productData);
  };

  return (
    <div className="pm-add-product-overlay">
      <div className="pm-add-product-form">
        <div className="pm-form-header">
          <h2>Add New Product</h2>
          <button onClick={onClose} className="pm-form-close">×</button>
        </div>

        {error && <div className="pm-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="pm-form-group">
            <label>Product Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Enter product name"
            />
          </div>

          <div className="pm-form-row">
            <div className="pm-form-group">
              <label>Price ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
                placeholder="0.00"
              />
            </div>

            <div className="pm-form-group">
              <label>Stock</label>
              <input
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="pm-form-row">
            <div className="pm-form-group">
              <label>Warranty (months)</label>
              <input
                type="number"
                min="0"
                value={formData.warranty}
                onChange={(e) => setFormData({ ...formData, warranty: e.target.value })}
                placeholder="0"
              />
            </div>

            <div className="pm-form-group">
              <label>Category</label>
              {categoriesLoading ? (
                <select disabled><option>Loading categories...</option></select>
              ) : (
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="">No category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="pm-form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows="3"
              placeholder="Enter product description"
            />
          </div>

          <div className="pm-form-row">
            <div className="pm-form-group">
              <label>Model</label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="Product model"
              />
            </div>

            <div className="pm-form-group">
              <label>Serial Number</label>
              <input
                type="text"
                value={formData.serial_number}
                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                placeholder="Serial number (optional)"
              />
            </div>
          </div>

          <div className="pm-form-group">
            <label>Distributor</label>
            <input
              type="text"
              value={formData.distributor}
              onChange={(e) => setFormData({ ...formData, distributor: e.target.value })}
              placeholder="Distributor name"
            />
          </div>

          <div className="pm-form-actions">
            <button type="button" onClick={onClose} className="pm-cancel-btn">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="pm-submit-btn">
              {loading ? "Creating..." : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CategoryManagement({ categories, loading, error, onAddCategory, onDeleteCategory, onRefresh }) {
  if (loading) return <div className="pm-loading">Loading categories...</div>;
  if (error) return <div className="pm-error">{error}</div>;

  return (
    <div className="pm-section">
      <div className="pm-section-header">
        <h2>Category Management</h2>
        <div className="pm-section-actions">
          <button onClick={onAddCategory} className="pm-add-btn">Add Category</button>
          <button onClick={onRefresh} className="pm-refresh-btn">Refresh</button>
        </div>
      </div>

      {categories.length === 0 ? (
        <p className="pm-empty">No categories found.</p>
      ) : (
        <div className="pm-categories-list">
          {categories.map((category) => (
            <div key={category.id || category.slug || `category-${category.name}`} className="pm-category-item">
              <div className="pm-category-info">
                <h3>{category.name || 'Unnamed Category'}</h3>
                <p className="pm-category-slug">{category.slug || 'N/A'}</p>
                {category.product_count !== undefined && (
                  <p className="pm-category-count">{category.product_count} products</p>
                )}
              </div>
              <button
                onClick={() => onDeleteCategory(category.id || category.slug)}
                className="pm-category-delete-btn"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DeliveryLists({ deliveries, loading, error, onRefresh }) {
  if (loading) return <div className="pm-loading">Loading delivery lists...</div>;
  if (error) return <div className="pm-error">{error}</div>;

  return (
    <div className="pm-section">
      <div className="pm-section-header">
        <h2>Delivery Lists</h2>
        <button onClick={onRefresh} className="pm-refresh-btn">Refresh</button>
      </div>

      {deliveries.length === 0 ? (
        <p className="pm-empty">No orders found.</p>
      ) : (
        <div className="pm-deliveries-table-wrapper">
          <table className="pm-deliveries-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer ID</th>
                <th>Product ID</th>
                <th>Quantity</th>
                <th>Delivery Status</th>
                <th>Shipping Address</th>
                <th>Order Date</th>
                <th>Delivery Time</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.flatMap((delivery) => {
                // Determine if delivery is completed based on status
                const status = (delivery.status || "").toLowerCase();
                const isCompleted = status === "delivered" || delivery.is_delivery_completed === true;
                const items = delivery.items || [];
                
                // If order has multiple items, create a row for each item
                if (items.length > 0) {
                  return items.map((item, itemIndex) => (
                    <tr key={`${delivery.id}-${item.id || itemIndex}`}>
                      {itemIndex === 0 && (
                        <>
                          <td rowSpan={items.length} className="pm-order-id">
                            #{delivery.id}
                          </td>
                          <td rowSpan={items.length} className="pm-customer-id">
                            {delivery.user_id || delivery.user?.id || delivery.user || "N/A"}
                          </td>
                        </>
                      )}
                      <td className="pm-product-id">{item.product_id || item.product?.id || item.product || "N/A"}</td>
                      <td className="pm-quantity">{item.quantity || 0}</td>
                      {itemIndex === 0 && (
                        <>
                          <td rowSpan={items.length} className={`pm-delivery-status ${isCompleted ? 'completed' : 'not-completed'}`}>
                            <span className={`pm-status-badge ${isCompleted ? 'completed' : 'not-completed'}`}>
                              {isCompleted ? "✓ Completed" : "✗ Not Completed"}
                            </span>
                          </td>
                          <td rowSpan={items.length} className="pm-shipping-address">
                            {delivery.shipping_address || "N/A"}
                          </td>
                          <td rowSpan={items.length} className="pm-order-date">
                            {delivery.created_at ? new Date(delivery.created_at).toLocaleDateString() : "N/A"}
                          </td>
                          <td rowSpan={items.length} className="pm-delivery-time">
                            {delivery.delivered_at 
                              ? new Date(delivery.delivered_at).toLocaleString() 
                              : "Not Delivered"}
                          </td>
                        </>
                      )}
                    </tr>
                  ));
                } else {
                  // Fallback if no items
                  return (
                    <tr key={delivery.id}>
                      <td>#{delivery.id}</td>
                      <td>{delivery.user_id || delivery.user?.id || delivery.user || "N/A"}</td>
                      <td>N/A</td>
                      <td>0</td>
                      <td className={`pm-delivery-status ${isCompleted ? 'completed' : 'not-completed'}`}>
                        <span className={`pm-status-badge ${isCompleted ? 'completed' : 'not-completed'}`}>
                          {isCompleted ? "✓ Completed" : "✗ Not Completed"}
                        </span>
                      </td>
                      <td>{delivery.shipping_address || "N/A"}</td>
                      <td>{delivery.created_at ? new Date(delivery.created_at).toLocaleDateString() : "N/A"}</td>
                      <td className="pm-delivery-time">
                        {delivery.delivered_at 
                          ? new Date(delivery.delivered_at).toLocaleString() 
                          : "Not Delivered"}
                      </td>
                    </tr>
                  );
                }
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function InvoiceViewing({ invoices, loading, error, fromDate, toDate, onFromDateChange, onToDateChange, onDownloadInvoice }) {
  return (
    <div className="pm-section">
      <div className="pm-section-header">
        <h2>Invoice Viewing</h2>
      </div>

      <div className="pm-date-filters">
        <div>
          <label>From Date:</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => onFromDateChange(e.target.value)}
          />
        </div>
        <div>
          <label>To Date:</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => onToDateChange(e.target.value)}
          />
        </div>
      </div>

      {loading && <div className="pm-loading">Loading invoices...</div>}
      {error && <div className="pm-error">{error}</div>}

      {fromDate && toDate && !loading && !error && (
        <div className="pm-invoices-list">
          {invoices.length === 0 ? (
            <p className="pm-empty">No invoices found for the selected date range.</p>
          ) : (
            invoices.map((invoice) => (
              <div key={invoice.id} className="pm-invoice-card">
                <div className="pm-invoice-header">
                  <h3>Invoice #{invoice.id}</h3>
                  <button
                    onClick={() => onDownloadInvoice(invoice.id)}
                    className="pm-download-btn"
                  >
                    Download Invoice
                  </button>
                </div>
                <p>Order Date: {new Date(invoice.created_at).toLocaleDateString()}</p>
                <p>Customer: {invoice.shipping_name || "N/A"}</p>
                <p>Total: ${Number(invoice.total_price || 0).toFixed(2)}</p>
                <p>Status: {invoice.status}</p>
              </div>
            ))
          )}
        </div>
      )}

      {!fromDate || !toDate ? (
        <p className="pm-empty">Please select a date range to view invoices.</p>
      ) : null}
    </div>
  );
}
