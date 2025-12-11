// src/api/wishlist.js
import { api, USE_MOCK, wait } from "./client";

const mockWishlist = [];

function extractMessage(error, fallback = "Wishlist operation failed") {
  return (
    error?.response?.data?.detail ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

export async function fetchWishlist() {
  if (USE_MOCK) {
    await wait(100);
    return mockWishlist;
  }

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

  if (USE_MOCK) {
    await wait(100);
    if (mockWishlist.find((item) => item.product === numericId)) {
      throw new Error("Product already in wishlist");
    }
    const item = {
      id: Date.now(),
      product: numericId,
      product_name: `Product ${numericId}`,
      product_price: "99.99",
      created_at: new Date().toISOString(),
    };
    mockWishlist.push(item);
    return item;
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

  if (USE_MOCK) {
    await wait(100);
    const index = mockWishlist.findIndex((item) => item.id === numericId);
    if (index === -1) {
      throw new Error("Wishlist item not found");
    }
    mockWishlist.splice(index, 1);
    return {};
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

  if (USE_MOCK) {
    await wait(100);
    const index = mockWishlist.findIndex((item) => item.product === numericProductId);
    if (index === -1) {
      throw new Error("Product not in wishlist");
    }
    mockWishlist.splice(index, 1);
    return {};
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

