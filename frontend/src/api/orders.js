import api from "../api/client";
import { getStoredOrders, saveOrder, updateStoredOrder } from "../stores/orders";

function extractMessage(error, fallback = "Unable to create order") {
  return (
    error?.response?.data?.error || error?.response?.data?.detail ||
    error?.response?.data?.message ||
    (Array.isArray(error?.response?.data) ? error.response.data[0] : null) ||
    error?.message ||
    fallback
  );
}

function normalizeItems(items = []) {
  return items
    .map((item) => {
      const productId = Number(item.product_id ?? item.productId ?? item.id);
      const quantity = Math.max(1, Number(item.quantity ?? item.qty ?? 1) || 1);
      const price = Number(item.price ?? item.unit_price ?? 0);
      return {
        product_id: productId,
        quantity,
        price,
        name: item.name ?? item.product?.name,
      };
    })
    .filter((item) => Number.isFinite(item.product_id));
}

export async function createOrder({ items = [], shipping = {}, customer = {}, payment = {}, totals = {} }) {
  const normalizedItems = normalizeItems(items);
  if (!normalizedItems.length) throw new Error("Your cart is empty.");

  const payload = {
    items: normalizedItems,
    shipping,
    customer,
    payment,
    totals,
  };

  try {
    const { data } = await api.post("/orders/checkout/", payload);
    // Save order locally so we can display it later
    const orderToSave = {
      ...data,
      items: normalizedItems,
      shipping: {
        name: shipping.full_name || shipping.name,
        address: shipping.address,
        city: shipping.city,
        phone: shipping.phone
      }
    };
    saveOrder(orderToSave);
    return data;
  } catch (error) {
    throw new Error(extractMessage(error));
  }
}

export async function fetchUserOrders() {
  try {
    const { data } = await api.get("/orders/");
    // Handle paginated response (DRF default)
    if (Array.isArray(data)) {
      return data;
    }
    if (Array.isArray(data?.results)) {
      return data.results;
    }
    if (Array.isArray(data?.items)) {
      return data.items;
    }
    // Fallback to empty array if unexpected format
    console.warn("Unexpected orders response format:", data);
    return [];
  } catch (error) {
    console.warn("Orders API failed, using locally stored orders:", error);
    // Fallback to locally stored orders if backend endpoint doesn't exist
    return getStoredOrders();
  }
}

export async function fetchOrderById(orderId) {
  try {
    const { data } = await api.get(`/orders/${orderId}/`);
    return data;
  } catch (error) {
    throw new Error(extractMessage(error, "Failed to fetch order"));
  }
}

export async function cancelOrder(orderId) {
  try {
    const { data } = await api.post(`/orders/${orderId}/cancel/`);
    // Update local storage
    updateStoredOrder(orderId, { status: data.status || 'cancelled' });
    return data;
  } catch (error) {
    // If API fails, try updating local storage
    const updated = updateStoredOrder(orderId, { status: 'cancelled' });
    if (updated) {
      console.warn("Updated order status locally, backend update failed");
      return updated;
    }
    throw new Error(extractMessage(error, "Unable to cancel order"));
  }
}

export async function returnOrder(orderId) {
  try {
    const { data } = await api.post(`/orders/${orderId}/return/`);
    // Backend returns { message, order } - use the order object
    const updatedOrder = data.order || data;
    // Update local storage
    updateStoredOrder(orderId, { status: updatedOrder.status || 'return_requested' });
    return updatedOrder;
  } catch (error) {
    throw new Error(extractMessage(error, "Unable to request return"));
  }
}

// Admin functions for order management
export async function fetchAllOrders() {
  // Don't use mock data for admin functions - always fetch from real API
  // This ensures Sales Managers and Product Managers see real orders

  try {
    const { data } = await api.get("/orders/admin/");
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.items)) return data.items;
    return data;
  } catch (error) {
    throw new Error(extractMessage(error, "Failed to load orders"));
  }
}

export async function updateOrderStatus(orderId, newStatus) {
  const validStatuses = ["pending", "processing", "in-transit", "shipped", "delivered", "cancelled", "return_requested", "returned"];
  if (!validStatuses.includes(newStatus)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
  }

  try {
    const { data } = await api.patch(`/orders/${orderId}/status/`, { status: newStatus });
    return data;
  } catch (error) {
    throw new Error(extractMessage(error, "Failed to update order status"));
  }
}

export async function applyDiscount(orderId, discountPercentage) {
  const discount = Number(discountPercentage);
  if (isNaN(discount) || discount < 0 || discount > 90) {
    throw new Error("Discount must be between 0 and 90");
  }

  // Don't use mock data for discount application - always use real API

  try {
    const { data } = await api.post(`/orders/${orderId}/apply-discount/`, {
      discount_percentage: discount,
    });
    return data;
  } catch (error) {
    throw new Error(extractMessage(error, "Failed to apply discount"));
  }
}

export async function downloadInvoice(orderId) {
  const numericId = Number(orderId);
  if (!Number.isFinite(numericId) || orderId.toString().includes('MOCK')) {
    throw new Error("Invalid order ID");
  }

  try {
    const response = await api.get(`/orders/${numericId}/download-invoice/`, {
      responseType: 'blob', // Important: tell axios to expect binary data
    });
    return response.data; // Returns the blob
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error("Order not found");
    } else if (error.response?.status === 403) {
      throw new Error("You do not have permission to download this invoice");
    }
    throw new Error(extractMessage(error, "Failed to download invoice"));
  }
}

// Sales Manager functions for return management
export async function approveReturn(orderId) {
  const numericId = Number(orderId);
  if (!Number.isFinite(numericId)) {
    throw new Error("Invalid order ID");
  }

  try {
    const { data } = await api.post(`/orders/${numericId}/approve-return/`);
    // Backend returns { message, order } - return the order object
    return data.order || data;
  } catch (error) {
    throw new Error(extractMessage(error, "Failed to approve return"));
  }
}

export async function denyReturn(orderId) {
  const numericId = Number(orderId);
  if (!Number.isFinite(numericId)) {
    throw new Error("Invalid order ID");
  }

  try {
    const { data } = await api.post(`/orders/${numericId}/deny-return/`);
    // Backend returns { message, order } - return the order object
    return data.order || data;
  } catch (error) {
    throw new Error(extractMessage(error, "Failed to deny return"));
  }
}
