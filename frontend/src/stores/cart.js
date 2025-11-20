import api from "../lib/api";

const LSK = "guest_cart";

function normalizeId(productId) {
  const id = Number(productId);
  return Number.isFinite(id) ? id : null;
}

export function getGuestCart() {
  try {
    return JSON.parse(localStorage.getItem(LSK) || "[]");
  } catch {
    return [];
  }
}

export function setGuestCart(items) {
  localStorage.setItem(LSK, JSON.stringify(items));
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

// This will run after login
export async function mergeGuestCartIfAny() {
  const items = getGuestCart();
  if (!items.length) return;

  // Future: when backend has /cart/merge endpoint, use that instead
  for (const it of items) {
    try {
      await api.post("/cart/items", { product_id: it.productId, qty: it.qty });
    } catch {
      // ignore for now
    }
  }
  localStorage.removeItem(LSK);
}
