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
    const { data } = await api.post("/orders/", payload);
    return data;
  } catch (error) {
    throw new Error(extractMessage(error));
  }
}

