import api from "../lib/api";

const LSK = "guest_cart";

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
  const items = getGuestCart();
  const i = items.findIndex((x) => x.productId === productId);
  if (i >= 0) items[i].qty += qty;
  else items.push({ productId, qty });
  setGuestCart(items);
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
