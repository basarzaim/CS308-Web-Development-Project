// src/api/wishlist.js
import { api } from "./client";

function extractMessage(error, fallback = "Wishlist operation failed") {
  return (
    error?.response?.data?.detail ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

export async function fetchWishlist() {
  try {
    const { data } = await api.get("/wishlist/");
    // Backend returns array of wishlist items with product info
    return Array.isArray(data) ? data : data.results ?? [];
  } catch (error) {
    throw new Error(extractMessage(error, "Failed to load wishlist"));
  }
}

export async function addToWishlist(productId) {
  const numericId = Number(productId);
  if (!Number.isFinite(numericId)) {
    throw new Error("Invalid product ID");
  }

  try {
    const { data } = await api.post("/wishlist/", { product: numericId });
    return data;
  } catch (error) {
    // If already exists, that's okay - return success
    if (error.response?.status === 400 && error.response?.data?.detail?.includes("already")) {
      return { product: numericId };
    }
    throw new Error(extractMessage(error, "Failed to add to wishlist"));
  }
}

export async function removeFromWishlist(wishlistItemId) {
  const numericId = Number(wishlistItemId);
  if (!Number.isFinite(numericId)) {
    throw new Error("Invalid wishlist item ID");
  }

  try {
    await api.delete(`/wishlist/${numericId}/`);
    return {};
  } catch (error) {
    throw new Error(extractMessage(error, "Failed to remove from wishlist"));
  }
}

// Helper: Remove by product ID (uses efficient backend endpoint)
export async function removeFromWishlistByProduct(productId) {
  const numericProductId = Number(productId);
  if (!Number.isFinite(numericProductId)) {
    throw new Error("Invalid product ID");
  }

  try {
    // Use efficient endpoint that deletes by product ID directly
    await api.delete(`/wishlist/product/${numericProductId}/`);
    return {};
  } catch (error) {
    // Handle 404 as success (item already not in wishlist)
    if (error.response?.status === 404) {
      return {};
    }
    throw new Error(extractMessage(error, "Failed to remove from wishlist"));
  }
}

