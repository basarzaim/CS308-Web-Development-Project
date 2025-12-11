// src/stores/wishlist.js
import * as wishlistAPI from "../api/wishlist";

const LSK = "guest_wishlist";

function normalizeId(productId) {
  const id = Number(productId);
  return Number.isFinite(id) ? id : null;
}

function isAuthenticated() {
  return !!localStorage.getItem("access_token");
}

// Guest wishlist functions (localStorage)
export function getGuestWishlist() {
  try {
    return JSON.parse(localStorage.getItem(LSK) || "[]");
  } catch {
    return [];
  }
}

export function setGuestWishlist(items) {
  localStorage.setItem(LSK, JSON.stringify(items));
  // Dispatch event for navigation badge updates
  window.dispatchEvent(new Event('wishlistUpdated'));
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

export function clearGuestWishlist() {
  localStorage.removeItem(LSK);
}

// Unified wishlist functions (use backend when authenticated)
export async function getWishlist() {
  if (isAuthenticated()) {
    try {
      const items = await wishlistAPI.fetchWishlist();
      // Return array of product IDs for consistency
      return items.map((item) => item.product?.id ?? item.product);
    } catch (error) {
      console.error("Failed to fetch wishlist:", error);
      return getGuestWishlist(); // Fallback to guest
    }
  }
  return getGuestWishlist();
}

export async function addToWishlist(productId) {
  const id = normalizeId(productId);
  if (id == null) return;

  if (isAuthenticated()) {
    try {
      await wishlistAPI.addToWishlist(id);
      window.dispatchEvent(new Event('wishlistUpdated'));
      return true;
    } catch (error) {
      console.error("Failed to add to wishlist:", error);
      // Fallback to guest wishlist
      addToGuestWishlist(id);
      return false;
    }
  } else {
    addToGuestWishlist(id);
    return true;
  }
}

export async function removeFromWishlist(productId) {
  const id = normalizeId(productId);
  if (id == null) return;

  if (isAuthenticated()) {
    try {
      await wishlistAPI.removeFromWishlistByProduct(id);
      window.dispatchEvent(new Event('wishlistUpdated'));
      return true;
    } catch (error) {
      console.error("Failed to remove from wishlist:", error);
      // Fallback to guest wishlist
      removeFromGuestWishlist(id);
      return false;
    }
  } else {
    removeFromGuestWishlist(id);
    return true;
  }
}

export async function isInWishlist(productId) {
  const id = normalizeId(productId);
  if (id == null) return false;

  if (isAuthenticated()) {
    try {
      const wishlist = await wishlistAPI.fetchWishlist();
      return wishlist.some(
        (item) => (item.product?.id ?? item.product) === id
      );
    } catch (error) {
      console.error("Failed to check wishlist:", error);
      return isInGuestWishlist(id); // Fallback
    }
  }
  return isInGuestWishlist(id);
}

export async function toggleWishlist(productId) {
  const id = normalizeId(productId);
  if (id == null) return;

  const isIn = await isInWishlist(id);
  if (isIn) {
    await removeFromWishlist(id);
  } else {
    await addToWishlist(id);
  }
}

export async function getWishlistCount() {
  if (isAuthenticated()) {
    try {
      const wishlist = await wishlistAPI.fetchWishlist();
      return wishlist.length;
    } catch (error) {
      console.error("Failed to get wishlist count:", error);
      return getGuestWishlist().length; // Fallback
    }
  }
  return getGuestWishlist().length;
}

// Legacy guest-only functions (kept for backward compatibility)
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

