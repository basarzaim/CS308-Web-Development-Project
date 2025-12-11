// src/stores/cart.js
import * as cartAPI from "../api/cart";

const LSK = "guest_cart";

function normalizeId(productId) {
  const id = Number(productId);
  return Number.isFinite(id) ? id : null;
}

function isAuthenticated() {
  return !!localStorage.getItem("access_token");
}

// Guest cart functions (localStorage)
export function getGuestCart() {
  try {
    return JSON.parse(localStorage.getItem(LSK) || "[]");
  } catch {
    return [];
  }
}

export function setGuestCart(items) {
  localStorage.setItem(LSK, JSON.stringify(items));
  // Dispatch event for navigation badge updates
  window.dispatchEvent(new Event('cartUpdated'));
}

export function addToGuestCart(productId, qty = 1) {
  const id = normalizeId(productId);
  if (id == null) return;
  const amount = Math.max(1, Number(qty) || 1);
  const items = getGuestCart();
  const index = items.findIndex((x) => normalizeId(x.productId) === id);
  if (index >= 0) items[index].qty += amount;
  else items.push({ productId: id, qty: amount });
  setGuestCart(items);
}

export function updateGuestCartQty(productId, qty = 1) {
  const id = normalizeId(productId);
  if (id == null) return;
  const amount = Math.max(1, Number(qty) || 1);
  const items = getGuestCart();
  const index = items.findIndex((x) => normalizeId(x.productId) === id);
  if (index >= 0) {
    items[index].qty = amount;
    setGuestCart(items);
  }
}

export function removeFromGuestCart(productId) {
  const id = normalizeId(productId);
  if (id == null) return;
  const items = getGuestCart().filter((x) => normalizeId(x.productId) !== id);
  setGuestCart(items);
}

export function clearGuestCart() {
  localStorage.removeItem(LSK);
}

export function getGuestCartCount() {
  return getGuestCart().reduce((sum, item) => sum + Number(item.qty || 0), 0);
}

// Unified cart functions (use backend when authenticated)
export async function getCart() {
  if (isAuthenticated()) {
    try {
      const items = await cartAPI.fetchCart();
      // Convert backend format to frontend format
      return items.map((item) => ({
        productId: item.product_id,
        qty: item.qty || item.quantity,
        id: item.id,
        name: item.name,
        price: item.price,
      }));
    } catch (error) {
      console.error("Failed to fetch cart:", error);
      return getGuestCart(); // Fallback to guest
    }
  }
  return getGuestCart();
}

export async function addToCart(productId, qty = 1) {
  const id = normalizeId(productId);
  if (id == null) return;

  if (isAuthenticated()) {
    try {
      await cartAPI.addToCart(id, qty);
      window.dispatchEvent(new Event('cartUpdated'));
      return true;
    } catch (error) {
      console.error("Failed to add to cart:", error);
      // Fallback to guest cart
      addToGuestCart(id, qty);
      return false;
    }
  } else {
    addToGuestCart(id, qty);
    return true;
  }
}

export async function updateCartQty(productId, qty = 1) {
  const id = normalizeId(productId);
  if (id == null) return;

  if (isAuthenticated()) {
    try {
      // First fetch cart to find item ID
      const cart = await getCart();
      const item = cart.find((i) => i.productId === id);
      if (item && item.id) {
        await cartAPI.updateCartItem(item.id, qty);
        window.dispatchEvent(new Event('cartUpdated'));
        return true;
      }
      // If not found, add it
      await cartAPI.addToCart(id, qty);
      window.dispatchEvent(new Event('cartUpdated'));
      return true;
    } catch (error) {
      console.error("Failed to update cart:", error);
      updateGuestCartQty(id, qty);
      return false;
    }
  } else {
    updateGuestCartQty(id, qty);
    return true;
  }
}

export async function removeFromCart(productId) {
  const id = normalizeId(productId);
  if (id == null) return;

  if (isAuthenticated()) {
    try {
      await cartAPI.removeCartItemByProduct(id);
      window.dispatchEvent(new Event('cartUpdated'));
      return true;
    } catch (error) {
      console.error("Failed to remove from cart:", error);
      removeFromGuestCart(id);
      return false;
    }
  } else {
    removeFromGuestCart(id);
    return true;
  }
}

export async function getCartCount() {
  if (isAuthenticated()) {
    try {
      const cart = await getCart();
      return cart.reduce((sum, item) => sum + Number(item.qty || 0), 0);
    } catch (error) {
      console.error("Failed to get cart count:", error);
      return getGuestCartCount(); // Fallback
    }
  }
  return getGuestCartCount();
}

export async function clearCart() {
  if (isAuthenticated()) {
    try {
      await cartAPI.clearCart();
      window.dispatchEvent(new Event('cartUpdated'));
      return true;
    } catch (error) {
      console.error("Failed to clear cart:", error);
      return false;
    }
  } else {
    clearGuestCart();
    return true;
  }
}

// Merge guest cart to backend on login
export async function mergeGuestCartIfAny() {
  if (!isAuthenticated()) return;
  
  const guestItems = getGuestCart();
  if (!guestItems.length) return;

  try {
    // Use backend merge endpoint
    await cartAPI.mergeGuestCart();
    clearGuestCart();
  } catch (error) {
    console.error("Failed to merge cart:", error);
    // Fallback: add items one by one
    for (const item of guestItems) {
      try {
        await cartAPI.addToCart(item.productId, item.qty);
      } catch {
        // ignore individual failures
      }
    }
    clearGuestCart();
  }
}
