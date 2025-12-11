import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchAllOrders, updateOrderStatus, applyDiscount } from "../api/orders";
import "./AdminOrders.css";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "return_requested", label: "Return Requested" },
  { value: "returned", label: "Returned" },
];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [processing, setProcessing] = useState(new Set());
  const [statusFilter, setStatusFilter] = useState("all");
  const [discountInputs, setDiscountInputs] = useState({});

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    setLoading(true);
    setError("");
    try {
      const allOrders = await fetchAllOrders();
      setOrders(allOrders);
    } catch (err) {
      setError(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusUpdate(orderId, newStatus) {
    setProcessing((prev) => new Set(prev).add(orderId));
    setError("");
    setNotice("");
    try {
      const updatedOrder = await updateOrderStatus(orderId, newStatus);
      setOrders((prev) =>
        prev.map((order) => (order.id === orderId ? updatedOrder : order))
      );
      setNotice(`Order #${orderId} status updated to ${newStatus}`);
      setTimeout(() => setNotice(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to update order status");
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  }

  async function handleApplyDiscount(orderId) {
    const discount = discountInputs[orderId] || 0;
    setProcessing((prev) => new Set(prev).add(orderId));
    setError("");
    setNotice("");
    try {
      const updatedOrder = await applyDiscount(orderId, discount);
      setOrders((prev) =>
        prev.map((order) => (order.id === orderId ? updatedOrder : order))
      );
      setNotice(`Discount of ${discount}% applied to Order #${orderId}`);
      setTimeout(() => setNotice(""), 3000);
      setDiscountInputs((prev) => ({ ...prev, [orderId]: "" }));
    } catch (err) {
      setError(err.message || "Failed to apply discount");
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  }

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { label: "Pending", className: "status-pending" },
      processing: { label: "Processing", className: "status-processing" },
      shipped: { label: "Shipped", className: "status-shipped" },
      delivered: { label: "Delivered", className: "status-delivered" },
      cancelled: { label: "Cancelled", className: "status-cancelled" },
      return_requested: { label: "Return Requested", className: "status-return" },
      returned: { label: "Returned", className: "status-returned" },
    };

    const { label, className } = statusMap[status] || {
      label: status,
      className: "status-default",
    };
    return <span className={`status-badge ${className}`}>{label}</span>;
  };

  const filteredOrders =
    statusFilter === "all"
      ? orders
      : orders.filter((order) => order.status === statusFilter);

  const statusCounts = STATUS_OPTIONS.reduce((acc, status) => {
    acc[status.value] = orders.filter((o) => o.status === status.value).length;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="admin-orders-page">
        <div className="admin-orders-card">
          <p>Loading orders…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-orders-page">
      <header className="admin-orders-header">
        <div>
          <p className="breadcrumbs">
            <Link to="/products">Products</Link> / <span>Order Management</span>
          </p>
          <h1>Order Management</h1>
          <p className="muted">
            Manage all orders and update their status. {orders.length} total order{orders.length !== 1 ? "s" : ""}.
          </p>
        </div>
        <button onClick={loadOrders} className="refresh-btn" disabled={loading}>
          Refresh
        </button>
      </header>

      {error && <div className="alert error">{error}</div>}
      {notice && <div className="alert success">{notice}</div>}

      <div className="admin-orders-filters">
        <label>
          Filter by status:
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">
              All ({orders.length})
            </option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label} ({statusCounts[status.value] || 0})
              </option>
            ))}
          </select>
        </label>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="admin-orders-card">
          <p className="muted">
            {statusFilter === "all"
              ? "No orders found."
              : `No orders with status "${statusFilter}".`}
          </p>
        </div>
      ) : (
        <section className="admin-orders-card">
          <ul className="admin-orders-list">
            {filteredOrders.map((order) => (
              <li key={order.id} className="admin-order-item">
                <div className="admin-order-header">
                  <div className="order-info">
                    <h3>Order #{order.id}</h3>
                    <p className="order-date">
                      {new Date(order.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {order.user && (
                      <p className="order-user">
                        Customer: {order.user.username || order.user.email || `User #${order.user.id}`}
                      </p>
                    )}
                  </div>
                  <div className="order-status-display">
                    {getStatusBadge(order.status)}
                  </div>
                </div>

                <div className="order-items">
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="order-item">
                      <div className="item-details">
                        <p className="item-name">{item.name || `Product ${idx + 1}`}</p>
                        <p className="item-qty">Qty: {item.quantity || 1}</p>
                      </div>
                      <div className="item-price">
                        ${(
                          Number(item.price || 0) * Number(item.quantity || 1)
                        ).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>

                {order.shipping && (
                  <div className="order-shipping">
                    <h4>Shipping Address</h4>
                    <p>{order.shipping.name || order.shipping.full_name}</p>
                    <p>{order.shipping.address}</p>
                    <p>{order.shipping.city}</p>
                    <p>{order.shipping.phone}</p>
                    {order.shipping.notes && (
                      <p className="shipping-notes">Notes: {order.shipping.notes}</p>
                    )}
                  </div>
                )}

                <div className="order-summary">
                  <div className="summary-row">
                    <span>Subtotal:</span>
                    <span>${Number(order.subtotal || order.total_price || 0).toFixed(2)}</span>
                  </div>
                  {(order.shipping_fee || (typeof order.shipping === 'number' && order.shipping !== 0)) && (
                    <div className="summary-row">
                      <span>Shipping:</span>
                      <span>${Number(order.shipping_fee || order.shipping || 0).toFixed(2)}</span>
                    </div>
                  )}
                  {order.discount_percentage > 0 && (
                    <div className="summary-row discount">
                      <span>Discount ({order.discount_percentage}%):</span>
                      <span>-${((Number(order.total_price || 0) * Number(order.discount_percentage)) / 100).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="summary-row total">
                    <span>Total:</span>
                    <span>${Number(order.discounted_total_price || order.total || order.total_price || 0).toFixed(2)}</span>
                  </div>
                </div>

                {order.status !== "delivered" && (
                  <div className="discount-panel">
                    <h4>Sales Manager Discount</h4>
                    <div className="discount-controls">
                      <input
                        type="number"
                        min="0"
                        max="90"
                        step="1"
                        placeholder="Discount %"
                        value={discountInputs[order.id] || ""}
                        onChange={(e) =>
                          setDiscountInputs((prev) => ({
                            ...prev,
                            [order.id]: e.target.value,
                          }))
                        }
                        disabled={processing.has(order.id)}
                      />
                      <button
                        onClick={() => handleApplyDiscount(order.id)}
                        disabled={
                          processing.has(order.id) ||
                          !discountInputs[order.id] ||
                          Number(discountInputs[order.id]) < 0 ||
                          Number(discountInputs[order.id]) > 90
                        }
                        className="apply-discount-btn"
                      >
                        Apply Discount
                      </button>
                    </div>
                    <p className="discount-note">Discount must be between 0-90%</p>
                  </div>
                )}

                <div className="admin-order-actions">
                  <label>
                    Update Status:
                    <select
                      value={order.status}
                      onChange={(e) =>
                        handleStatusUpdate(order.id, e.target.value)
                      }
                      disabled={processing.has(order.id)}
                      className="status-select"
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {processing.has(order.id) && (
                    <span className="processing-indicator">Updating…</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

