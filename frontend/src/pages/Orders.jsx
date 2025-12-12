import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchUserOrders, cancelOrder, returnOrder } from "../api/orders";
import "./Orders.css";

export default function Orders() {
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    async function loadOrders() {
      try {
        setLoading(true);
        setError("");
        const data = await fetchUserOrders();
        // Ensure data is an array
        const ordersArray = Array.isArray(data) ? data : [];
        setOrders(ordersArray);
      } catch (err) {
        console.error("Error loading orders:", err);
        setError(err.message || "Failed to load orders");
        setOrders([]); // Set empty array on error
      } finally {
        setLoading(false);
      }
    }

    loadOrders();
  }, [isAuthenticated, authLoading]);

  const handleCancel = async (orderId) => {
    if (!confirm("Are you sure you want to cancel this order?")) return;

    try {
      setActionLoading(orderId);
      setError("");
      setNotice("");
      const updatedOrder = await cancelOrder(orderId);
      setOrders(orders.map(order => order.id === orderId ? updatedOrder : order));
      setNotice("Order cancelled successfully");
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReturn = async (orderId) => {
    if (!confirm("Are you sure you want to request a return for this order?")) return;

    try {
      setActionLoading(orderId);
      setError("");
      setNotice("");
      const updatedOrder = await returnOrder(orderId);
      setOrders(orders.map(order => order.id === orderId ? updatedOrder : order));
      setNotice("Return request submitted successfully");
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { label: "Pending", className: "status-pending" },
      processing: { label: "Processing", className: "status-processing" },
      "in-transit": { label: "In Transit", className: "status-shipped" },
      shipped: { label: "Shipped", className: "status-shipped" },
      delivered: { label: "Delivered", className: "status-delivered" },
      cancelled: { label: "Cancelled", className: "status-cancelled" },
      return_requested: { label: "Return Requested", className: "status-return" },
      returned: { label: "Returned", className: "status-returned" }
    };

    const { label, className } = statusMap[status] || { label: status, className: "status-default" };
    return <span className={`status-badge ${className}`}>{label}</span>;
  };

  const canCancel = (status) => {
    return ["pending", "processing"].includes(status);
  };

  const canReturn = (status) => {
    return status === "delivered";
  };

  const handleDownloadInvoice = async (orderId) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('Please log in to download invoices');
        return;
      }

      // Fetch PDF from backend
      const response = await fetch(`http://localhost:8000/api/orders/${orderId}/download-invoice/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download invoice');
      }

      // Get the PDF blob
      const blob = await response.blob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice_${orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setNotice('Invoice downloaded successfully!');
      setTimeout(() => setNotice(''), 3000);
    } catch (err) {
      console.error('Error downloading invoice:', err);
      setError('Failed to download invoice. Please try again.');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Show loading while auth is loading
  if (authLoading || loading) {
    return (
      <div className="orders-page">
        <div className="orders-header">
          <h1>My Orders</h1>
        </div>
        <div>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="orders-page">
        <div className="orders-header">
          <h1>My Orders</h1>
        </div>
        <div className="alert error">
          Please log in to view your orders.
        </div>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <div className="orders-header">
        <h1>My Orders</h1>
      </div>

      {error && <div className="alert error">{error}</div>}
      {notice && <div className="alert success">{notice}</div>}

      {orders.length === 0 ? (
        <div className="orders-empty">
          <p>You haven't placed any orders yet.</p>
          <a href="/products" className="primary-btn">Start Shopping</a>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <div key={order.id} className="order-card">
              <div className="order-header">
                <div className="order-info">
                  <h3>Order #{order.id}</h3>
                  <p className="order-date">
                    {new Date(order.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div className="order-status">
                  {getStatusBadge(order.status)}
                </div>
              </div>

              <div className="order-items">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="order-item">
                    <div className="item-details">
                      <p className="item-name">{item.name}</p>
                      <p className="item-qty">Qty: {item.quantity}</p>
                    </div>
                    <div className="item-price">
                      ${(Number(item.price || item.unit_price || 0) * Number(item.quantity || 1)).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              {order.shipping && (
                <div className="order-shipping">
                  <h4>Shipping Address</h4>
                  <p>{order.shipping.name}</p>
                  <p>{order.shipping.address}</p>
                  <p>{order.shipping.city}</p>
                  <p>{order.shipping.phone}</p>
                </div>
              )}

              <div className="order-summary">
                <div className="summary-row">
                  <span>Subtotal:</span>
                  <span>${Number(order.subtotal || order.total_price || 0).toFixed(2)}</span>
                </div>
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

              <div className="order-actions">
                <button
                  className="btn-primary"
                  onClick={() => handleDownloadInvoice(order.id)}
                  title="Download invoice as PDF"
                >
                  📄 Download PDF Invoice
                </button>
                {canCancel(order.status) && (
                  <button
                    className="btn-secondary"
                    onClick={() => handleCancel(order.id)}
                    disabled={actionLoading === order.id}
                  >
                    {actionLoading === order.id ? "Cancelling..." : "Cancel Order"}
                  </button>
                )}
                {canReturn(order.status) && (
                  <button
                    className="btn-secondary"
                    onClick={() => handleReturn(order.id)}
                    disabled={actionLoading === order.id}
                  >
                    {actionLoading === order.id ? "Requesting..." : "Request Return"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
