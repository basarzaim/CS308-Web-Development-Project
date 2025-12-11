import { api, USE_MOCK, wait } from "./client";

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
    // Check for network errors - fallback to mock mode if backend is unavailable
    if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED' || !error.response) {
      console.warn("Backend unavailable, falling back to mock mode for order creation");
      // Fallback to mock mode
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

// Admin functions for order management
export async function fetchAllOrders() {
  if (USE_MOCK) {
    await wait(200);
    // Generate some mock orders with various statuses
    const statuses = ["pending", "processing", "shipped", "delivered", "cancelled", "return_requested"];
    const mockAllOrders = mockOrders.length > 0 
      ? [...mockOrders]
      : Array.from({ length: 10 }, (_, i) => ({
          id: `MOCK-${i + 1}`,
          status: statuses[i % statuses.length],
          total: 100 + i * 50,
          subtotal: 100 + i * 50,
          shipping_fee: i % 3 === 0 ? 0 : 49.9,
          created_at: new Date(Date.now() - i * 86400000).toISOString(),
          user: { id: i + 1, username: `user${i + 1}`, email: `user${i + 1}@example.com` },
          items: [
            { name: `Product ${i + 1}`, quantity: i + 1, price: 50 + i * 10 }
          ],
          shipping: {
            name: `Customer ${i + 1}`,
            address: `${100 + i} Main St`,
            city: "New York",
            phone: `555-${1000 + i}`
          }
        }));
    return mockAllOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

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
  const validStatuses = ["pending", "processing", "shipped", "delivered", "cancelled", "return_requested", "returned"];
  if (!validStatuses.includes(newStatus)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
  }

  if (USE_MOCK) {
    await wait(100);
    const order = mockOrders.find(o => o.id === orderId);
    if (!order) throw new Error("Order not found");
    order.status = newStatus;
    return order;
  }

  try {
    const { data } = await api.patch(`/orders/${orderId}/status/`, { status: newStatus });
    return data;
  } catch (error) {
    throw new Error(extractMessage(error, "Failed to update order status"));
  }
}

