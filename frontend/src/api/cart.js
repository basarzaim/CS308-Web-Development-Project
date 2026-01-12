// src/api/cart.js
import { api } from "./client";

function extractMessage(error, fallback = "Cart operation failed") {
  return (
    error?.response?.data?.detail ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

export async function fetchCart() {
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

  try {
    await api.delete(`/cart/product/${numericId}/remove/`);
    return {};
  } catch (error) {
    throw new Error(extractMessage(error, "Failed to remove cart item"));
  }
}

export async function clearCart() {
  try {
    await api.delete("/cart/clear/");
    return {};
  } catch (error) {
    throw new Error(extractMessage(error, "Failed to clear cart"));
  }
}

export async function mergeGuestCart() {
  try {
    const { data } = await api.post("/cart/merge/");
    return data;
  } catch (error) {
    throw new Error(extractMessage(error, "Failed to merge cart"));
  }
}

