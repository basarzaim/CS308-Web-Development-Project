import { useEffect, useState } from "react";
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

  if (authLoading) {
    return <div style={{ padding: 24 }}>Loading...</div>;
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

  // Load products data
  useEffect(() => {
    if (activeTab === "products") {
      loadProducts();
    }
  }, [activeTab]);

  // Load categories data
  useEffect(() => {
    if (activeTab === "categories") {
      loadCategories();
    }
  }, [activeTab]);

  // Load deliveries data
  useEffect(() => {
    if (activeTab === "deliveries") {
      loadDeliveries();
    }
  }, [activeTab]);

  // Load invoices data
  useEffect(() => {
    if (activeTab === "invoices" && fromDate && toDate) {
      loadInvoices();
    }
  }, [activeTab, fromDate, toDate]);

  async function loadProducts() {
    setProductsLoading(true);
    setProductsError("");
    try {
      const { fetchProducts } = await import("../api/products");
      const data = await fetchProducts({ page: 1, limit: 200 }); // Load more products for management
      setProducts(data.items || []);
    } catch (err) {
      setProductsError(err.message || "Failed to load products");
    } finally {
      setProductsLoading(false);
    }
  }

  async function loadCategories() {
    setCategoriesLoading(true);
    setCategoriesError("");
    try {
      const { fetchCategories } = await import("../api/products");
      const data = await fetchCategories();
      setCategories(data || []);
    } catch (err) {
      setCategoriesError(err.message || "Failed to load categories");
    } finally {
      setCategoriesLoading(false);
    }
  }

  async function loadDeliveries() {
    setDeliveriesLoading(true);
    setDeliveriesError("");
    try {
      const { fetchAllOrders } = await import("../api/orders");
      const allOrders = await fetchAllOrders();
      // Filter for orders that need delivery (shipped but not delivered)
      const deliveryOrders = allOrders.filter(order =>
        order.status === "shipped" || order.status === "in-transit"
      );
      setDeliveries(deliveryOrders);
    } catch (err) {
      setDeliveriesError(err.message || "Failed to load delivery lists");
    } finally {
      setDeliveriesLoading(false);
    }
  }

  async function loadInvoices() {
    if (!fromDate || !toDate) return;

    setInvoicesLoading(true);
    setInvoicesError("");
    try {
      const { fetchAllOrders } = await import("../api/orders");
      const allOrders = await fetchAllOrders();

      // Filter orders by date range and completed status
      const filteredInvoices = allOrders.filter(order => {
        const orderDate = new Date(order.created_at);
        const from = new Date(fromDate);
        const to = new Date(toDate);
        to.setHours(23, 59, 59); // Include entire end date

        return orderDate >= from && orderDate <= to &&
               (order.status === "delivered" || order.status === "completed");
      });

      setInvoices(filteredInvoices);
    } catch (err) {
      setInvoicesError(err.message || "Failed to load invoices");
    } finally {
      setInvoicesLoading(false);
    }
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
    const categorySlug = prompt("Enter category slug (lowercase, no spaces):");
    const description = prompt("Enter category description (optional):") || "";

    if (!categoryName || !categorySlug) return;

    try {
      const { createCategory } = await import("../api/products");
      await createCategory({
        name: categoryName,
        slug: categorySlug,
        description: description
      });
      loadCategories(); // Refresh categories
    } catch (err) {
      alert("Failed to add category: " + err.message);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!confirm("Are you sure you want to delete this category? This will fail if the category contains products.")) return;

    try {
      const { deleteCategory } = await import("../api/products");
      await deleteCategory(categoryId);
      loadCategories(); // Refresh categories
    } catch (err) {
      alert("Failed to delete category: " + err.message);
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

  if (loading) return <div className="pm-loading">Loading products...</div>;
  if (error) return <div className="pm-error">{error}</div>;

  return (
    <div className="pm-section">
      <div className="pm-section-header">
        <h2>Product Management</h2>
        <button onClick={onRefresh} className="pm-refresh-btn">Refresh</button>
      </div>

      {products.length === 0 ? (
        <p className="pm-empty">No products found.</p>
      ) : (
        <div className="pm-products-grid">
          {products.map((product) => (
            <div key={product.id} className="pm-product-card">
              <img
                src={product.image || "/placeholder-product.png"}
                alt={product.name}
                className="pm-product-image"
              />
              <div className="pm-product-info">
                <h3>{product.name}</h3>
                <p className="pm-product-price">${Number(product.price || 0).toFixed(2)}</p>
                <p className="pm-product-category">{product.category || "No category"}</p>

                <div className="pm-stock-control">
                  <label>Stock:</label>
                  {editingStock === product.id ? (
                    <input
                      type="number"
                      min="0"
                      defaultValue={product.stock || 0}
                      onBlur={(e) => {
                        const newStock = Number(e.target.value);
                        if (!isNaN(newStock)) {
                          onUpdateStock(product.id, newStock);
                        }
                        setEditingStock(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.target.blur();
                        } else if (e.key === 'Escape') {
                          setEditingStock(null);
                        }
                      }}
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
            <div key={category.slug} className="pm-category-item">
              <div className="pm-category-info">
                <h3>{category.name}</h3>
                <p className="pm-category-slug">{category.slug}</p>
                {category.product_count !== undefined && (
                  <p className="pm-category-count">{category.product_count} products</p>
                )}
              </div>
              <button
                onClick={() => onDeleteCategory(category.slug)}
                className="pm-delete-btn"
                disabled
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
        <p className="pm-empty">No deliveries pending.</p>
      ) : (
        <div className="pm-deliveries-list">
          {deliveries.map((delivery) => (
            <div key={delivery.id} className="pm-delivery-card">
              <div className="pm-delivery-header">
                <h3>Order #{delivery.id}</h3>
                <span className={`pm-delivery-status status-${delivery.status}`}>
                  {delivery.status === "in-transit" ? "In Transit" :
                   delivery.status === "shipped" ? "Shipped" : delivery.status}
                </span>
              </div>

              <div className="pm-delivery-info">
                <p><strong>Customer:</strong> {delivery.user?.username || "Unknown"}</p>
                <p><strong>Date:</strong> {new Date(delivery.created_at).toLocaleDateString()}</p>
                <p><strong>Total:</strong> ${Number(delivery.total || delivery.total_price || 0).toFixed(2)}</p>
              </div>

              {delivery.shipping && (
                <div className="pm-delivery-address">
                  <h4>Shipping Address</h4>
                  <p>{delivery.shipping.name}</p>
                  <p>{delivery.shipping.address}</p>
                  <p>{delivery.shipping.city}</p>
                  <p>{delivery.shipping.phone}</p>
                </div>
              )}
            </div>
          ))}
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
        <div className="pm-date-input">
          <label>From Date:</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => onFromDateChange(e.target.value)}
          />
        </div>
        <div className="pm-date-input">
          <label>To Date:</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => onToDateChange(e.target.value)}
          />
        </div>
      </div>

      {(!fromDate || !toDate) && (
        <p className="pm-info">Please select both from and to dates to view invoices.</p>
      )}

      {loading && <div className="pm-loading">Loading invoices...</div>}
      {error && <div className="pm-error">{error}</div>}

      {fromDate && toDate && !loading && !error && (
        invoices.length === 0 ? (
          <p className="pm-empty">No invoices found for the selected date range.</p>
        ) : (
          <div className="pm-invoices-list">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="pm-invoice-card">
                <div className="pm-invoice-header">
                  <h3>Invoice #{invoice.id}</h3>
                  <span className="pm-invoice-status">Completed</span>
                </div>

                <div className="pm-invoice-info">
                  <p><strong>Customer:</strong> {invoice.user?.username || "Unknown"}</p>
                  <p><strong>Date:</strong> {new Date(invoice.created_at).toLocaleDateString()}</p>
                  <p><strong>Total:</strong> ${Number(invoice.total || invoice.total_price || 0).toFixed(2)}</p>
                </div>

                <div className="pm-invoice-actions">
                  <button
                    onClick={() => onDownloadInvoice(invoice.id)}
                    className="pm-download-btn"
                  >
                    📄 Download PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
