import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchProductById } from "../api/products";
import { createOrder } from "../api/orders";
import {
  getCart,
  updateCartQty,
  removeFromCart,
  clearGuestCart,
  clearCart,
} from "../stores/cart";
import { useAuth } from "../context/AuthContext";
import "./Checkout.css";

const INITIAL_FORM = {
  full_name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  notes: "",
  payment: "card",
};

const SHIPPING_THRESHOLD = 1000;
const SHIPPING_FEE = 49.9;

export default function Checkout() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(INITIAL_FORM);
  const [placing, setPlacing] = useState(false);
  const [orderResult, setOrderResult] = useState(null);
  const [phoneError, setPhoneError] = useState("");
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    // Wait for auth to finish loading before checking authentication
    if (authLoading) {
      return; // Don't do anything while auth is loading
    }

    // Check if user is authenticated
    if (!isAuthenticated) {
      setShowLoginModal(true);
      setLoading(false);
    } else {
      setShowLoginModal(false);
      hydrateCart();
    }
  }, [isAuthenticated, authLoading]);

  const totals = useMemo(() => {
    const subtotal = cartItems.reduce((sum, item) => {
      const qty = typeof item.qty === 'string' ? (Number(item.qty) || 1) : item.qty;
      return sum + Number(item.price || 0) * qty;
    }, 0);
    const shipping = cartItems.length ? (subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE) : 0;
    return {
      subtotal,
      shipping,
      total: subtotal + shipping,
    };
  }, [cartItems]);

  async function hydrateCart() {
    setLoading(true);
    setError("");
    try {
      const rawItems = await getCart();
      if (!rawItems.length) {
        setCartItems([]);
        setLoading(false);
        return;
      }
      // Cart API already returns name and price - no need to fetch product details
      // Only fetch if we're missing critical data
      const hydrated = await Promise.all(
        rawItems.map(async (entry) => {
          // If we already have name and price from cart API, use them
          if (entry.name && entry.price) {
            return {
              ...entry,
              product: { 
                id: entry.productId, 
                name: entry.name,
                price: entry.price 
              },
              price: Number(entry.price || 0),
            };
          }
          // Fallback: fetch product details only if missing
          try {
            const product = await fetchProductById(entry.productId);
            return {
              ...entry,
              product,
              price: Number(entry.price || product.price || 0),
            };
          } catch {
            return {
              ...entry,
              product: { id: entry.productId, name: entry.name || `Product #${entry.productId}` },
              price: Number(entry.price || 0),
            };
          }
        })
      );
      setCartItems(hydrated);
    } catch (err) {
      setError(err.message || "Failed to load cart.");
    } finally {
      setLoading(false);
    }
  }

  async function handleQtyChange(productId, value) {
    // Allow empty string or any input for editing - validate on blur
    const numValue = Number(value);
    if (value === '' || isNaN(numValue) || numValue < 1) {
      // Allow empty or invalid input temporarily for editing
      // Store as string temporarily so user can delete and type
      setCartItems((prev) =>
        prev.map((item) =>
          Number(item.productId) === Number(productId) ? { ...item, qty: value === '' ? '' : (isNaN(numValue) ? value : numValue) } : item
        )
      );
    } else {
      // Valid number entered - update immediately
      const nextQty = Math.max(1, numValue);
      await updateCartQty(productId, nextQty);
      setCartItems((prev) =>
        prev.map((item) =>
          Number(item.productId) === Number(productId) ? { ...item, qty: nextQty } : item
        )
      );
    }
  }

  async function handleQtyBlur(productId, value) {
    // Validate and set minimum on blur - ensure we always have a valid number
    const numValue = Number(value);
    const nextQty = Math.max(1, numValue || 1);
    await updateCartQty(productId, nextQty);
    setCartItems((prev) =>
      prev.map((item) =>
        Number(item.productId) === Number(productId) ? { ...item, qty: nextQty } : item
      )
    );
  }

  async function handleRemove(productId) {
    await removeFromCart(productId);
    setCartItems((prev) => prev.filter((item) => Number(item.productId) !== Number(productId)));
  }

  function updateForm(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleNameChange(value) {
    // Remove numbers from full name
    const filtered = value.replace(/[0-9]/g, '');
    updateForm('full_name', filtered);
  }

  function validatePhone(phone) {
    if (!phone) return false;
    const phoneDigits = phone.replace(/[^0-9]/g, '');
    return phoneDigits.length >= 7 && phoneDigits.length <= 13;
  }

  function handlePhoneChange(value) {
    // Allow only numbers in phone field
    const filtered = value.replace(/[^0-9]/g, '');
    updateForm('phone', filtered);
    
    // Validate phone length
    if (filtered && (filtered.length < 7 || filtered.length > 13)) {
      setPhoneError("Please enter a valid phone number.");
    } else {
      setPhoneError("");
    }
  }

  function handlePhoneBlur() {
    // Validate on blur
    if (form.phone && !validatePhone(form.phone)) {
      setPhoneError("Please enter a valid phone number.");
    } else {
      setPhoneError("");
    }
  }

  function handleEmailChange(value) {
    updateForm('email', value);
  }

  function validateEmail(email) {
    if (!email) return true; // Email is optional
    // Must have @, at least 2 letters after @, and end with .com
    const emailRegex = /^[^\s@]+@[a-zA-Z]{2,}\.com$/;
    return emailRegex.test(email);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setOrderResult(null);

    if (!cartItems.length) {
      setError("Your cart is empty. Please add products.");
      return;
    }
    if (!form.full_name || !form.address || !form.city || !form.phone) {
      setError("Please fill in the required shipping fields.");
      return;
    }
    if (!validatePhone(form.phone)) {
      setError("Please enter a valid phone number.");
      setPhoneError("Please enter a valid phone number.");
      return;
    }
    if (form.email && !validateEmail(form.email)) {
      setError("Please enter a valid email address (must have at least 2 letters after @ and end with .com).");
      return;
    }

    setPlacing(true);
    try {
      const payload = {
        items: cartItems.map((item) => {
          // Ensure qty is a number, not a string
          const qty = typeof item.qty === 'string' ? (Number(item.qty) || 1) : item.qty;
          return {
            product_id: item.product?.id ?? item.productId,
            productId: item.productId,
            name: item.product?.name,
            qty: qty,
            quantity: qty, // Also include as 'quantity' for API compatibility
            price: item.price,
          };
        }),
        shipping: {
          full_name: form.full_name,
          address: form.address,
          city: form.city,
          phone: form.phone,
          notes: form.notes,
        },
        customer: {
          email: form.email,
        },
        payment: {
          method: form.payment,
        },
        totals,
      };

      const order = await createOrder(payload);
      setOrderResult(order);
      
      // Clear cart after successful order
      if (isAuthenticated) {
        // Clear backend cart for authenticated users
        await clearCart();
      } else {
        // Clear localStorage cart for guest users
        clearGuestCart();
      }
      
      // Clear local state
      setCartItems([]);
      setForm(INITIAL_FORM);
    } catch (err) {
      // Check if it's a network error
      const isNetworkError = err.message?.includes('Network Error') || 
                            err.message?.includes('network') ||
                            err.code === 'ERR_NETWORK' ||
                            err.code === 'ECONNABORTED' ||
                            !err.response;
      
      if (isNetworkError) {
        setError("Network Error: Unable to connect to the server. Please check if the backend is running or try again later.");
      } else {
        setError(err.message || "Could not create the order.");
      }
    } finally {
      setPlacing(false);
    }
  }

  // Show login modal if not authenticated
  if (showLoginModal) {
    return (
      <div className="order-modal-overlay">
        <div className="order-modal">
          <div className="order-modal-icon" style={{ backgroundColor: '#f59e0b' }}>!</div>
          <h2 className="order-modal-title">Login Required</h2>
          <p className="order-modal-message">
            You need to be logged in to complete your purchase. Please log in or create an account to continue.
          </p>
          <div className="order-modal-actions">
            <button
              className="order-modal-btn primary"
              onClick={() => navigate('/login', { state: { from: '/checkout' } })}
            >
              Go to Login
            </button>
            <button
              className="order-modal-btn secondary"
              onClick={() => navigate('/products')}
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="checkout-page">
        <section className="checkout-card">
          <p>Loading cart…</p>
        </section>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <header className="checkout-header">
        <div>
          <p className="breadcrumbs">
            <Link to="/products">Products</Link> / <span>Checkout</span>
          </p>
          <h1>Checkout</h1>
          <p className="muted">Review the items in your cart and enter delivery details.</p>
        </div>
        <Link to="/products" className="link">
          Continue shopping
        </Link>
      </header>

      {error && <div className="alert error">{error}</div>}
      
      {/* Order Confirmation Modal */}
      {orderResult && (
        <div className="order-modal-overlay" onClick={() => setOrderResult(null)}>
          <div className="order-modal" onClick={(e) => e.stopPropagation()}>
            <div className="order-modal-icon">✓</div>
            <h2 className="order-modal-title">Order Confirmed!</h2>
            <p className="order-modal-message">
              Thank you for your purchase. Your order has been successfully placed.
            </p>
            <div className="order-modal-details">
              <p><strong>Order Number:</strong> #{orderResult.id}</p>
            </div>
            <div className="order-modal-actions">
              <Link to="/products" className="order-modal-btn primary">
                Continue Shopping
              </Link>
              <button 
                className="order-modal-btn secondary"
                onClick={() => setOrderResult(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="checkout-grid">
        <section className="checkout-card">
          <h2>Cart</h2>
          {!cartItems.length ? (
            <div className="muted">
              Your cart is empty. <Link to="/products">Browse products.</Link>
            </div>
          ) : (
            <ul className="cart-list">
              {cartItems.map((item) => (
                <li key={item.productId} className="cart-row">
                  <div>
                    <p className="cart-name">{item.product?.name ?? `Product #${item.productId}`}</p>
                    <p className="cart-price">${Number(item.price).toFixed(2)}</p>
                  </div>
                  <div className="cart-controls">
                    <label className="cart-qty">
                      Quantity:
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => handleQtyChange(item.productId, e.target.value)}
                        onFocus={(e) => e.target.select()}
                        onBlur={(e) => handleQtyBlur(item.productId, e.target.value)}
                      />
                    </label>
                    <button type="button" className="link danger" onClick={() => handleRemove(item.productId)}>
                      Remove
                    </button>
                  </div>
                  <div className="cart-subtotal">
                    ${(item.price * (typeof item.qty === 'string' ? (Number(item.qty) || 1) : item.qty)).toFixed(2)}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="summary">
            <div>
              <span>Subtotal</span>
              <strong>${totals.subtotal.toFixed(2)}</strong>
            </div>
            <div>
              <span>Shipping</span>
              <strong>{totals.shipping ? `$${totals.shipping.toFixed(2)}` : "Free"}</strong>
            </div>
            <div className="summary-total">
              <span>Order total</span>
              <strong>${totals.total.toFixed(2)}</strong>
            </div>
          </div>
        </section>

        <section className="checkout-card">
          <h2>Shipping & payment</h2>
          <form className="checkout-form" onSubmit={handleSubmit}>
            <label>
              Full name*
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                placeholder="Enter your full name"
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="example@mail.com"
                pattern="[^\s@]+@[a-zA-Z]{2,}\.com"
                title="Email must have at least 2 letters after @ and end with .com"
              />
              {form.email && !validateEmail(form.email) && (
                <span style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: '4px' }}>
                  Email must have at least 2 letters after @ and end with .com
                </span>
              )}
            </label>
            <label>
              Phone*
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                onBlur={handlePhoneBlur}
                required
                placeholder="Enter phone number"
                inputMode="numeric"
                maxLength={13}
              />
              {phoneError && (
                <span style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>
                  {phoneError}
                </span>
              )}
            </label>
            <label>
              Address*
              <textarea
                rows={3}
                value={form.address}
                onChange={(e) => updateForm("address", e.target.value)}
                required
              />
            </label>
            <label>
              City*
              <input
                type="text"
                value={form.city}
                onChange={(e) => updateForm("city", e.target.value)}
                required
              />
            </label>
            <label>
              Note
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => updateForm("notes", e.target.value)}
                placeholder="Optional courier note…"
              />
            </label>
            <label>
              Payment method
              <select value={form.payment} onChange={(e) => updateForm("payment", e.target.value)}>
                <option value="card">Credit / Debit Card</option>
                <option value="cash">Cash on Delivery</option>
                <option value="bank">Bank Transfer</option>
              </select>
            </label>

            <button type="submit" className="primary-btn" disabled={placing || !cartItems.length}>
              {placing ? "Placing order…" : "Place order"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

