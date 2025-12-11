// src/api/cart.js
import { api, USE_MOCK, wait } from "./client";

function extractMessage(error, fallback = "Cart operation failed") {
  return (
    error?.response?.data?.detail ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

export async function fetchCart() {
  if (USE_MOCK) {
    await wait(100);
    return [];
  }

  try {
    const { data } = await api.get("/cart/");
    return Array.isArray(data?.cart) ? data.cart : [];
  } catch (error) {
    throw new Error(extractMessage(error, "Failed to load cart"));
  }
}

export async function addToCart(productId, quantity = 1) {
  const numericId = Number(productId);
  const qty = Math.max(1, Number(quantity) || 1);
  
  if (!Number.isFinite(numericId)) {
    throw new Error("Invalid product ID");
  }

  if (USE_MOCK) {
    await wait(100);
    return { message: "added to cart" };
  }

  try {
    const { data } = await api.post("/cart/add/", {
      product_id: numericId,
      quantity: qty,
    });
    return data;
  } catch (error) {
    throw new Error(extractMessage(error, "Failed to add to cart"));
  }
}

export async function updateCartItem(itemId, quantity) {
  const numericId = Number(itemId);
  const qty = Math.max(1, Number(quantity) || 1);
  
  if (!Number.isFinite(numericId)) {
    throw new Error("Invalid cart item ID");
  }

  if (USE_MOCK) {
    await wait(100);
    return { id: numericId, quantity: qty };
  }

  try {
    const { data } = await api.patch(`/cart/${numericId}/`, {
      quantity: qty,
    });
    return data;
  } catch (error) {
    throw new Error(extractMessage(error, "Failed to update cart item"));
  }
}

export async function removeCartItem(itemId) {
  const numericId = Number(itemId);
  
  if (!Number.isFinite(numericId)) {
    throw new Error("Invalid cart item ID");
  }

  if (USE_MOCK) {
    await wait(100);
    return {};
  }

  try {
    await api.delete(`/cart/${numericId}/remove/`);
    return {};
  } catch (error) {
    throw new Error(extractMessage(error, "Failed to remove cart item"));
  }
}

export async function removeCartItemByProduct(productId) {
  const numericId = Number(productId);
  
  if (!Number.isFinite(numericId)) {
    throw new Error("Invalid product ID");
  }

  if (USE_MOCK) {
    await wait(100);
    return {};
  }

  try {
    await api.delete(`/cart/product/${numericId}/remove/`);
    return {};
  } catch (error) {
    throw new Error(extractMessage(error, "Failed to remove cart item"));
  }
}

export async function clearCart() {
  if (USE_MOCK) {
    await wait(100);
    return {};
  }

  try {
    await api.delete("/cart/clear/");
    return {};
  } catch (error) {
    throw new Error(extractMessage(error, "Failed to clear cart"));
  }
}

export async function mergeGuestCart() {
  if (USE_MOCK) {
    await wait(100);
    return { merged_items: 0 };
  }

  try {
    const { data } = await api.post("/cart/merge/");
    return data;
  } catch (error) {
    throw new Error(extractMessage(error, "Failed to merge cart"));
  }
}

