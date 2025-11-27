import api from "../lib/api";
import { USE_MOCK, wait } from "./client";

const mockOrders = [];

function extractMessage(error, fallback = "Unable to create order") {
  return (
    error?.response?.data?.detail ||
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

  if (USE_MOCK) {
    await wait(150);
    const subtotal = normalizedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shippingFee = totals.shipping ?? (subtotal >= 1000 ? 0 : 49.9);
    const total = totals.total ?? subtotal + shippingFee;
    const order = {
      id: `MOCK-${mockOrders.length + 1}`,
      status: "processing",
      subtotal,
      shipping: shippingFee,
      total,
      created_at: new Date().toISOString(),
    };
    mockOrders.push(order);
    return order;
  }

  try {
    const { data } = await api.post("/orders/checkout/", payload);
    return data;
  } catch (error) {
    throw new Error(extractMessage(error));
  }
}

export async function fetchUserOrders() {
  if (USE_MOCK) {
    await wait(200);
    return mockOrders.map(order => ({
      ...order,
      items: [
        { name: "Sample Product", quantity: 2, price: 299.99 }
      ],
      shipping: {
        name: "John Doe",
        address: "123 Main St",
        city: "New York",
        phone: "555-1234"
      }
    }));
  }

  try {
    const { data } = await api.get("/orders/");
    return data;
  } catch (error) {
    throw new Error(extractMessage(error, "Unable to fetch orders"));
  }
}

export async function fetchOrderById(orderId) {
  if (USE_MOCK) {
    await wait(150);
    const order = mockOrders.find(o => o.id === orderId);
    if (!order) throw new Error("Order not found");
    return {
      ...order,
      items: [
        { name: "Sample Product", quantity: 2, price: 299.99 }
      ],
      shipping: {
        name: "John Doe",
        address: "123 Main St",
        city: "New York",
        phone: "555-1234"
      }
    };
  }

  try {
    const { data } = await api.get(`/orders/${orderId}/`);
    return data;
  } catch (error) {
    throw new Error(extractMessage(error, "Unable to fetch order details"));
  }
}

export async function cancelOrder(orderId) {
  if (USE_MOCK) {
    await wait(150);
    const order = mockOrders.find(o => o.id === orderId);
    if (!order) throw new Error("Order not found");
    if (order.status === "cancelled") throw new Error("Order is already cancelled");
    if (order.status === "delivered") throw new Error("Cannot cancel delivered orders");
    order.status = "cancelled";
    return order;
  }

  try {
    const { data } = await api.post(`/orders/${orderId}/cancel/`);
    return data;
  } catch (error) {
    throw new Error(extractMessage(error, "Unable to cancel order"));
  }
}

export async function returnOrder(orderId) {
  if (USE_MOCK) {
    await wait(150);
    const order = mockOrders.find(o => o.id === orderId);
    if (!order) throw new Error("Order not found");
    if (order.status !== "delivered") throw new Error("Only delivered orders can be returned");
    order.status = "return_requested";
    return order;
  }

  try {
    const { data } = await api.post(`/orders/${orderId}/return/`);
    return data;
  } catch (error) {
    throw new Error(extractMessage(error, "Unable to request return"));
  }
}

