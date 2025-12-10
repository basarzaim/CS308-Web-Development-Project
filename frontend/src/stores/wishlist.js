const LSK = "guest_wishlist";

function normalizeId(productId) {
  const id = Number(productId);
  return Number.isFinite(id) ? id : null;
}

export function getGuestWishlist() {
  try {
    return JSON.parse(localStorage.getItem(LSK) || "[]");
  } catch {
    return [];
  }
}

export function setGuestWishlist(items) {
  localStorage.setItem(LSK, JSON.stringify(items));
}

export function addToGuestWishlist(productId) {
  const id = normalizeId(productId);
  if (id == null) return;
  const items = getGuestWishlist();
  if (!items.includes(id)) {
    items.push(id);
    setGuestWishlist(items);
  }
}

export function removeFromGuestWishlist(productId) {
  const id = normalizeId(productId);
  if (id == null) return;
  const items = getGuestWishlist().filter((x) => normalizeId(x) !== id);
  setGuestWishlist(items);
}

export function isInGuestWishlist(productId) {
  const id = normalizeId(productId);
  if (id == null) return false;
  return getGuestWishlist().includes(id);
}

export function toggleGuestWishlist(productId) {
  const id = normalizeId(productId);
  if (id == null) return;
  if (isInGuestWishlist(id)) {
    removeFromGuestWishlist(id);
  } else {
    addToGuestWishlist(id);
  }
}

export function getGuestWishlistCount() {
  return getGuestWishlist().length;
}

export function clearGuestWishlist() {
  localStorage.removeItem(LSK);
}

