import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchProductById } from "../api/products";
import { createOrder } from "../api/orders";
import {
  getGuestCart,
  updateGuestCartQty,
  removeFromGuestCart,
  clearGuestCart,
} from "../stores/cart";
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
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(INITIAL_FORM);
  const [placing, setPlacing] = useState(false);
  const [orderResult, setOrderResult] = useState(null);

  useEffect(() => {
    hydrateCart();
  }, []);

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
    const rawItems = getGuestCart();
    if (!rawItems.length) {
      setCartItems([]);
      setLoading(false);
      return;
    }
    try {
      const hydrated = await Promise.all(
        rawItems.map(async (entry) => {
          try {
            const product = await fetchProductById(entry.productId);
            return {
              ...entry,
              product,
              price: Number(product.price ?? 0),
            };
          } catch {
            return {
              ...entry,
              product: { id: entry.productId, name: `Product #${entry.productId}` },
              price: 0,
            };
          }
        })
      );
      setCartItems(hydrated);
    } catch (err) {
      setError(err.message || "Sepet bilgileri getirilemedi.");
    } finally {
      setLoading(false);
    }
  }

  function handleQtyChange(productId, value) {
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
      updateGuestCartQty(productId, nextQty);
      setCartItems((prev) =>
        prev.map((item) =>
          Number(item.productId) === Number(productId) ? { ...item, qty: nextQty } : item
        )
      );
    }
  }

  function handleQtyBlur(productId, value) {
    // Validate and set minimum on blur - ensure we always have a valid number
    const numValue = Number(value);
    const nextQty = Math.max(1, numValue || 1);
    updateGuestCartQty(productId, nextQty);
    setCartItems((prev) =>
      prev.map((item) =>
        Number(item.productId) === Number(productId) ? { ...item, qty: nextQty } : item
      )
    );
  }

  function handleRemove(productId) {
    removeFromGuestCart(productId);
    setCartItems((prev) => prev.filter((item) => Number(item.productId) !== Number(productId)));
  }

  function updateForm(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
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

    setPlacing(true);
    try {
      const payload = {
        items: cartItems.map((item) => ({
          product_id: item.product?.id ?? item.productId,
          productId: item.productId,
          name: item.product?.name,
          qty: item.qty,
          price: item.price,
        })),
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
      clearGuestCart();
      setCartItems([]);
      setForm(INITIAL_FORM);
    } catch (err) {
      setError(err.message || "Could not create the order.");
    } finally {
      setPlacing(false);
    }
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
      {orderResult && (
        <div className="alert success">
          Order received! Your order number is <strong>{orderResult.id}</strong>
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
                        onBlur={(e) => handleQtyBlur(item.productId, e.target.value)}
                        onFocus={(e) => e.target.select()}
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
                onChange={(e) => updateForm("full_name", e.target.value)}
                required
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateForm("email", e.target.value)}
                placeholder="ornek@mail.com"
              />
            </label>
            <label>
              Phone*
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => updateForm("phone", e.target.value)}
                required
              />
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

