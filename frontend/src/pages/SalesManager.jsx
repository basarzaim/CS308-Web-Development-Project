import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { isSalesManager } from "../utils/admin";
import { fetchProducts } from "../api/products";
import { fetchAllOrders, approveReturn, denyReturn } from "../api/orders";
import "./SalesManager.css";

// Helper to parse an ISO or date-like string into a Date, or null
function safeParseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Normalize total for revenue calculations
function getOrderTotal(order) {
  return Number(
    order?.discounted_total_price ??
      order?.total ??
      order?.total_price ??
      0
  );
}

// Compute profit assuming 50% cost of sale price when explicit cost is not provided
function getOrderProfit(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  if (items.length === 0) {
    const revenue = getOrderTotal(order);
    return revenue * 0.5;
  }

  let profit = 0;
  for (const item of items) {
    const price = Number(item.price ?? item.unit_price ?? 0);
    const quantity = Number(item.quantity ?? 1) || 1;
    const sale = price * quantity;
    const cost = sale * 0.5;
    profit += sale - cost;
  }
  return profit;
}

export default function SalesManager() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState("discounts");

  // Shared orders state for Invoices + Revenue/Profit
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    if (!authLoading && isAuthenticated && isSalesManager(user)) {
      loadOrders();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, user]);

  async function loadOrders() {
    setOrdersLoading(true);
    setOrdersError("");
    try {
      const allOrders = await fetchAllOrders();
      setOrders(Array.isArray(allOrders) ? allOrders : []);
    } catch (err) {
      setOrdersError(err.message || "Failed to load invoices");
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }

  const filteredOrders = useMemo(() => {
    const start = fromDate ? new Date(fromDate) : null;
    const end = toDate ? new Date(toDate) : null;

    return orders.filter((order) => {
      const createdAt = safeParseDate(order?.created_at);
      if (!createdAt) return false;

      if (start && createdAt < start) return false;
      if (end) {
        // Include the full end day
        const endOfDay = new Date(end);
        endOfDay.setHours(23, 59, 59, 999);
        if (createdAt > endOfDay) return false;
      }
      return true;
    });
  }, [orders, fromDate, toDate]);

  const revenueSummary = useMemo(() => {
    if (!filteredOrders.length) {
      return { totalRevenue: 0, totalProfit: 0, margin: 0 };
    }

    const totalRevenue = filteredOrders.reduce(
      (sum, o) => sum + getOrderTotal(o),
      0
    );
    const totalProfit = filteredOrders.reduce(
      (sum, o) => sum + getOrderProfit(o),
      0
    );
    const margin =
      totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalProfit,
      margin,
    };
  }, [filteredOrders]);

  const chartData = useMemo(() => {
    const byDay = new Map();

    filteredOrders.forEach((order) => {
      const d = safeParseDate(order?.created_at);
      if (!d) return;
      const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
      const entry = byDay.get(key) || {
        date: key,
        revenue: 0,
        profit: 0,
      };
      entry.revenue += getOrderTotal(order);
      entry.profit += getOrderProfit(order);
      byDay.set(key, entry);
    });

    const rows = Array.from(byDay.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    if (!rows.length) return [];

    const maxRevenue = Math.max(...rows.map((r) => r.revenue), 1);

    return rows.map((row) => ({
      ...row,
      // Heights as 0–100 for CSS scaling
      revenueHeight: (row.revenue / maxRevenue) * 100,
      profitHeight: (row.profit / maxRevenue) * 100,
    }));
  }, [filteredOrders]);

  if (authLoading) {
    return (
      <div className="sm-page">
        <div className="sm-card">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isSalesManager(user)) {
    return (
      <div className="sm-page">
        <div className="sm-card sm-card-center">
          <h1>Sales Manager Area</h1>
          <p className="sm-muted">
            You are not authorized to access the Sales Manager dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="sm-page">
      <header className="sm-header">
        <div>
          <p className="sm-breadcrumbs">Dashboard / Sales Manager</p>
          <h1>Sales Manager Dashboard</h1>
          <p className="sm-muted">
            Manage product discounts, view invoices, and track revenue &
            profit.
          </p>
        </div>
      </header>

      <div className="sm-tabs">
        <button
          type="button"
          className={
            activeTab === "discounts"
              ? "sm-tab sm-tab-active"
              : "sm-tab"
          }
          onClick={() => setActiveTab("discounts")}
        >
          Discount Management
        </button>
        <button
          type="button"
          className={
            activeTab === "prices"
              ? "sm-tab sm-tab-active"
              : "sm-tab"
          }
          onClick={() => setActiveTab("prices")}
        >
          Price Management
        </button>
        <button
          type="button"
          className={
            activeTab === "invoices"
              ? "sm-tab sm-tab-active"
              : "sm-tab"
          }
          onClick={() => setActiveTab("invoices")}
        >
          Invoices
        </button>
        <button
          type="button"
          className={
            activeTab === "revenue"
              ? "sm-tab sm-tab-active"
              : "sm-tab"
          }
          onClick={() => setActiveTab("revenue")}
        >
          Revenue &amp; Profit
        </button>
        <button
          type="button"
          className={
            activeTab === "returns"
              ? "sm-tab sm-tab-active"
              : "sm-tab"
          }
          onClick={() => setActiveTab("returns")}
        >
          Return Requests
        </button>
      </div>

      {activeTab === "discounts" && <DiscountManagement />}

      {activeTab === "prices" && <PriceManagement />}

      {activeTab === "invoices" && (
        <InvoicesSection
          orders={filteredOrders}
          loading={ordersLoading}
          error={ordersError}
          fromDate={fromDate}
          toDate={toDate}
          onFromDateChange={setFromDate}
          onToDateChange={setToDate}
          onReload={loadOrders}
        />
      )}

      {activeTab === "revenue" && (
        <RevenueSection
          loading={ordersLoading}
          error={ordersError}
          hasOrders={orders.length > 0}
          fromDate={fromDate}
          toDate={toDate}
          onFromDateChange={setFromDate}
          onToDateChange={setToDate}
          summary={revenueSummary}
          chartData={chartData}
        />
      )}

      {activeTab === "returns" && (
        <ReturnRequestsSection
          orders={filteredOrders}
          loading={ordersLoading}
          error={ordersError}
          onReload={loadOrders}
        />
      )}
    </div>
  );
}

function DiscountManagement() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [discountRate, setDiscountRate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadProducts() {
      setLoading(true);
      setError("");
      try {
        // Reuse existing API helper that understands pagination variations
        const { items } = await fetchProducts({
          page: 1,
          limit: 200,
          sort: "",
        });
        if (!ignore) {
          setProducts(Array.isArray(items) ? items : []);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || "Failed to load products");
          setProducts([]);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadProducts();
    return () => {
      ignore = true;
    };
  }, []);

  const allSelected =
    products.length > 0 && selectedIds.size === products.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  };

  const toggleProduct = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const numericDiscount = Number(discountRate);
  const isDiscountValid =
    !Number.isNaN(numericDiscount) &&
    numericDiscount > 0 &&
    numericDiscount <= 100;

  const productsWithPreview = useMemo(() => {
    if (!isDiscountValid) return [];
    return products
      .filter((p) => selectedIds.has(p.id))
      .map((p) => {
        const price = Number(p.price ?? 0);
        let newPrice =
          price - (price * numericDiscount) / 100;
        // Round to 2 decimal places to match backend DecimalField
        newPrice = Math.round(newPrice * 100) / 100;
        return {
          ...p,
          currentPrice: price,
          newPrice,
        };
      });
  }, [products, selectedIds, isDiscountValid, numericDiscount]);

  async function handleApplyDiscount() {
    if (!isDiscountValid || selectedIds.size === 0) {
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      // We deliberately use the generic products endpoint without
      // changing backend behavior. The backend is expected to
      // handle wishlist notifications when prices change.
      const { api } = await import("../api/client");
      const ids = Array.from(selectedIds);

      await Promise.all(
        ids.map(async (id) => {
          const product = products.find((p) => p.id === id);
          if (!product) return;
          const price = Number(product.price ?? 0);
          let newPrice =
            price - (price * numericDiscount) / 100;
          // Round to 2 decimal places to avoid floating point precision issues
          newPrice = Math.round(newPrice * 100) / 100;
          // PATCH only the price field so we don't make any
          // assumptions about other backend fields.
          await api.patch(`/products/${id}/`, {
            price: newPrice,
          });
        })
      );

      setNotice(
        `Discount of ${numericDiscount}% applied to ${selectedIds.size} product(s).`
      );
      setTimeout(() => setNotice(""), 4000);

      // Refresh list with updated prices
      const { items } = await fetchProducts({
        page: 1,
        limit: 200,
        sort: "",
      });
      setProducts(Array.isArray(items) ? items : []);

      // Keep selection but clear discount input for clarity
      setDiscountRate("");
    } catch (err) {
      setError(
        err.message ||
          "Failed to apply discount. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="sm-card">
      <header className="sm-card-header">
        <div>
          <h2>Discount Management</h2>
          <p className="sm-muted">
            Select products and apply a percentage discount. Users who
            have discounted products in their wishlist will be notified
            by the backend when prices are updated.
          </p>
        </div>
      </header>

      {error && <div className="sm-alert sm-alert-error">{error}</div>}
      {notice && (
        <div className="sm-alert sm-alert-success">{notice}</div>
      )}

      <div className="sm-discount-controls">
        <label className="sm-field">
          <span>Discount rate (%)</span>
          <input
            type="number"
            min="1"
            max="100"
            value={discountRate}
            onChange={(e) => setDiscountRate(e.target.value)}
            placeholder="e.g. 10"
          />
        </label>
        <button
          type="button"
          className="sm-primary-btn"
          onClick={handleApplyDiscount}
          disabled={
            saving ||
            !isDiscountValid ||
            selectedIds.size === 0
          }
        >
          {saving ? "Applying…" : "Apply Discount"}
        </button>
      </div>
      {!isDiscountValid && discountRate !== "" && (
        <p className="sm-validation">
          Please enter a discount between 1 and 100.
        </p>
      )}

      {loading ? (
        <p>Loading products…</p>
      ) : products.length === 0 ? (
        <p className="sm-muted">
          No products found. Once products are available, you can
          manage discounts here.
        </p>
      ) : (
        <div className="sm-table-wrapper">
          <table className="sm-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th>Product</th>
                <th>Category</th>
                <th>Current price</th>
                <th>New price (preview)</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const price = Number(p.price ?? 0);
                const selected = selectedIds.has(p.id);
                const preview = isDiscountValid
                  ? price - (price * numericDiscount) / 100
                  : null;
                return (
                  <tr key={p.id} className={selected ? "sm-row-selected" : ""}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleProduct(p.id)}
                      />
                    </td>
                    <td>
                      <div className="sm-product-cell">
                        {p.image && (
                          <img
                            src={p.image}
                            alt={p.name}
                            className="sm-product-thumb"
                          />
                        )}
                        <span>{p.name}</span>
                      </div>
                    </td>
                    <td>{p.category || "—"}</td>
                    <td>${price.toFixed(2)}</td>
                    <td>
                      {preview != null ? (
                        <span className="sm-price-new">
                          ${preview.toFixed(2)}
                        </span>
                      ) : (
                        <span className="sm-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function PriceManagement() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [newPrice, setNewPrice] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadProducts() {
      setLoading(true);
      setError("");
      try {
        const { items } = await fetchProducts({
          page: 1,
          limit: 200,
          sort: "",
        });
        if (!ignore) {
          setProducts(Array.isArray(items) ? items : []);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || "Failed to load products");
          setProducts([]);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadProducts();
    return () => {
      ignore = true;
    };
  }, []);

  const allSelected =
    products.length > 0 && selectedIds.size === products.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  };

  const toggleProduct = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const numericPrice = Number(newPrice);
  const isPriceValid =
    !Number.isNaN(numericPrice) &&
    numericPrice > 0;

  async function handleUpdatePrices() {
    if (!isPriceValid || selectedIds.size === 0) {
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const { api } = await import("../api/client");
      const ids = Array.from(selectedIds);

      await Promise.all(
        ids.map(async (id) => {
          await api.patch(`/products/${id}/`, {
            price: numericPrice,
          });
        })
      );

      setNotice(
        `Price set to $${numericPrice.toFixed(2)} for ${selectedIds.size} product(s).`
      );
      setTimeout(() => setNotice(""), 4000);

      // Refresh list with updated prices
      const { items } = await fetchProducts({
        page: 1,
        limit: 200,
        sort: "",
      });
      setProducts(Array.isArray(items) ? items : []);

      // Clear selection and price input
      setSelectedIds(new Set());
      setNewPrice("");
    } catch (err) {
      setError(
        err.message ||
          "Failed to update prices. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="sm-card">
      <header className="sm-card-header">
        <div>
          <h2>Price Management</h2>
          <p className="sm-muted">
            Select products and set their absolute prices. This will update the product prices directly.
            Users who have these products in their wishlist will be notified if prices decrease.
          </p>
        </div>
      </header>

      {error && <div className="sm-alert sm-alert-error">{error}</div>}
      {notice && (
        <div className="sm-alert sm-alert-success">{notice}</div>
      )}

      <div className="sm-discount-controls">
        <label className="sm-field">
          <span>New Price ($)</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            placeholder="e.g. 99.99"
          />
        </label>
        <button
          type="button"
          className="sm-primary-btn"
          onClick={handleUpdatePrices}
          disabled={
            saving ||
            !isPriceValid ||
            selectedIds.size === 0
          }
        >
          {saving ? "Updating…" : "Update Prices"}
        </button>
      </div>
      {!isPriceValid && newPrice !== "" && (
        <p className="sm-validation">
          Please enter a valid price greater than 0.
        </p>
      )}

      {loading ? (
        <p>Loading products…</p>
      ) : products.length === 0 ? (
        <p className="sm-muted">
          No products found. Once products are available, you can
          manage prices here.
        </p>
      ) : (
        <div className="sm-table-wrapper">
          <table className="sm-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th>Product</th>
                <th>Category</th>
                <th>Current price</th>
                <th>New price</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const price = Number(p.price ?? 0);
                const selected = selectedIds.has(p.id);
                return (
                  <tr key={p.id} className={selected ? "sm-row-selected" : ""}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleProduct(p.id)}
                      />
                    </td>
                    <td>
                      <div className="sm-product-cell">
                        {p.image && (
                          <img
                            src={p.image}
                            alt={p.name}
                            className="sm-product-thumb"
                          />
                        )}
                        <span>{p.name}</span>
                      </div>
                    </td>
                    <td>{p.category_name || p.category || "—"}</td>
                    <td>${price.toFixed(2)}</td>
                    <td>
                      {selected && isPriceValid ? (
                        <span className="sm-price-new">
                          ${numericPrice.toFixed(2)}
                        </span>
                      ) : (
                        <span className="sm-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function InvoicesSection({
  orders,
  loading,
  error,
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  onReload,
}) {
  const hasFilters = fromDate || toDate;

  const handlePrint = () => {
    window.print();
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
        if (response.status === 403) {
          alert('You do not have permission to download this invoice.');
        } else {
          alert('Failed to download invoice. Please try again.');
        }
        return;
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
    } catch (err) {
      console.error('Error downloading invoice:', err);
      alert('Failed to download invoice. Please try again.');
    }
  };

  return (
    <section className="sm-card">
      <header className="sm-card-header sm-card-header-row">
        <div>
          <h2>Invoices</h2>
          <p className="sm-muted">
            View all invoices in a date range. Use your browser&apos;s
            print dialog to save as PDF if needed.
          </p>
        </div>
        <button
          type="button"
          className="sm-secondary-btn"
          onClick={onReload}
          disabled={loading}
        >
          Refresh
        </button>
      </header>

      <div className="sm-filters">
        <label className="sm-field">
          <span>From date</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => onFromDateChange(e.target.value)}
          />
        </label>
        <label className="sm-field">
          <span>To date</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => onToDateChange(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="sm-secondary-btn"
          onClick={handlePrint}
          disabled={loading || !orders.length}
        >
          Print / Save as PDF
        </button>
      </div>

      {error && <div className="sm-alert sm-alert-error">{error}</div>}

      {loading ? (
        <p>Loading invoices…</p>
      ) : !orders.length ? (
        <p className="sm-muted">
          {hasFilters
            ? "No invoices found for the selected date range."
            : "No invoices available yet."}
        </p>
      ) : (
        <div className="sm-table-wrapper sm-print-area">
          <table className="sm-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Status</th>
                <th>Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.id}</td>
                  <td>
                    {order.user?.username ||
                      order.user?.email ||
                      (order.user?.id
                        ? `User #${order.user.id}`
                        : "—")}
                  </td>
                  <td>
                    {order.created_at
                      ? new Date(order.created_at).toLocaleString()
                      : "—"}
                  </td>
                  <td>{order.status || "—"}</td>
                  <td>${getOrderTotal(order).toFixed(2)}</td>
                  <td>
                    <button
                      type="button"
                      className="sm-secondary-btn sm-small-btn"
                      onClick={() => handleDownloadInvoice(order.id)}
                      title="Download invoice as PDF"
                    >
                      📄 PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
function RevenueSection({
  loading,
  error,
  hasOrders,
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  summary,
  chartData,
}) {
  const hasFilters = fromDate || toDate;

  return (
    <section className="sm-card">
      <header className="sm-card-header">
        <div>
          <h2>Revenue &amp; Profit</h2>
          <p className="sm-muted">
            Revenue is calculated from invoice totals. Profit assumes
            product cost is 50% of sale price when no explicit cost
            information is provided.
          </p>
        </div>
      </header>

      <div className="sm-filters">
        <label className="sm-field">
          <span>From date</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => onFromDateChange(e.target.value)}
          />
        </label>
        <label className="sm-field">
          <span>To date</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => onToDateChange(e.target.value)}
          />
        </label>
      </div>

      {error && <div className="sm-alert sm-alert-error">{error}</div>}

      {loading ? (
        <p>Calculating revenue…</p>
      ) : !hasOrders ? (
        <p className="sm-muted">
          {hasFilters
            ? "No data available for the selected date range."
            : "No invoice data available yet."}
        </p>
      ) : (
        <>
          <div className="sm-summary-grid">
            <div className="sm-summary-card">
              <h3>Total revenue</h3>
              <p className="sm-summary-value">
                ${summary.totalRevenue.toFixed(2)}
              </p>
            </div>
            <div className="sm-summary-card">
              <h3>Total profit</h3>
              <p className="sm-summary-value">
                ${summary.totalProfit.toFixed(2)}
              </p>
            </div>
            <div className="sm-summary-card">
              <h3>Profit margin</h3>
              <p className="sm-summary-value">
                {summary.margin.toFixed(1)}%
              </p>
            </div>
          </div>

          {chartData.length === 0 ? (
            <p className="sm-muted">
              No chart data available for the selected period.
            </p>
          ) : (
            <div className="sm-chart">
              <div className="sm-chart-body">
                {chartData.map((row) => (
                  <div key={row.date} className="sm-chart-column">
                    <div className="sm-chart-bars">
                      <div
                        className="sm-chart-bar sm-chart-bar-revenue"
                        style={{
                          height: `${row.revenueHeight}%`,
                        }}
                        title={`Revenue: $${row.revenue.toFixed(
                          2
                        )}`}
                      />
                      <div
                        className="sm-chart-bar sm-chart-bar-profit"
                        style={{
                          height: `${row.profitHeight}%`,
                        }}
                        title={`Profit: $${row.profit.toFixed(2)}`}
                      />
                    </div>
                    <span className="sm-chart-label">
                      {row.date}
                    </span>
                  </div>
                ))}
              </div>
              <div className="sm-chart-legend">
                <span className="sm-legend-item">
                  <span className="sm-legend-dot sm-legend-dot-revenue" />
                  Revenue
                </span>
                <span className="sm-legend-item">
                  <span className="sm-legend-dot sm-legend-dot-profit" />
                  Profit
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function ReturnRequestsSection({ orders, loading, error, onReload }) {
  const [processing, setProcessing] = useState(new Set());
  const [notice, setNotice] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Filter orders with return_requested status
  const returnRequests = orders.filter(
    (order) => order.status === "return_requested"
  );

  async function handleApproveReturn(orderId) {
    setProcessing((prev) => new Set(prev).add(orderId));
    setErrorMsg("");
    setNotice("");
    try {
      await approveReturn(orderId);
      setNotice("Return request approved successfully. Products have been restocked.");
      onReload();
    } catch (err) {
      setErrorMsg(err.message || "Failed to approve return");
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  }

  async function handleDenyReturn(orderId) {
    setProcessing((prev) => new Set(prev).add(orderId));
    setErrorMsg("");
    setNotice("");
    try {
      await denyReturn(orderId);
      setNotice("Return request denied. Order status reverted to 'Delivered'.");
      onReload();
    } catch (err) {
      setErrorMsg(err.message || "Failed to deny return");
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  }

  return (
    <div className="sm-card">
      <header className="sm-section-header">
        <div>
          <h2>Return Requests</h2>
          <p className="sm-muted">
            Review and manage customer return requests. Approve to restock products or deny to keep the order as delivered.
          </p>
        </div>
        <button
          type="button"
          className="sm-secondary-btn"
          onClick={onReload}
          disabled={loading}
        >
          Refresh
        </button>
      </header>

      {error && <div className="sm-alert sm-alert-error">{error}</div>}
      {errorMsg && <div className="sm-alert sm-alert-error">{errorMsg}</div>}
      {notice && <div className="sm-alert sm-alert-success">{notice}</div>}

      {loading ? (
        <p>Loading return requests…</p>
      ) : !returnRequests.length ? (
        <p className="sm-muted">No return requests pending.</p>
      ) : (
        <div className="sm-table-wrapper">
          <table className="sm-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Requested Date</th>
                <th>Delivered Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {returnRequests.map((order) => {
                const isProcessing = processing.has(order.id);
                return (
                  <tr key={order.id}>
                    <td>#{order.id}</td>
                    <td>{order.user?.email || order.user?.username || "N/A"}</td>
                    <td>
                      {order.items?.length || 0} item(s)
                    </td>
                    <td>${Number(order.discounted_total_price || order.total_price || 0).toFixed(2)}</td>
                    <td>
                      {order.updated_at
                        ? new Date(order.updated_at).toLocaleDateString()
                        : "N/A"}
                    </td>
                    <td>
                      {order.delivered_at
                        ? new Date(order.delivered_at).toLocaleDateString()
                        : "N/A"}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          type="button"
                          className="sm-primary-btn"
                          onClick={() => handleApproveReturn(order.id)}
                          disabled={isProcessing}
                          style={{ backgroundColor: "#28a745" }}
                        >
                          {isProcessing ? "Processing..." : "Approve"}
                        </button>
                        <button
                          type="button"
                          className="sm-secondary-btn"
                          onClick={() => handleDenyReturn(order.id)}
                          disabled={isProcessing}
                          style={{ backgroundColor: "#dc3545", color: "white" }}
                        >
                          {isProcessing ? "Processing..." : "Deny"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

