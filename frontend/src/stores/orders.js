// Local order storage for when backend doesn't have order list endpoints
const ORDERS_KEY = 'user_orders';

export function getStoredOrders() {
  try {
    const stored = localStorage.getItem(ORDERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveOrder(order) {
  try {
    const orders = getStoredOrders();
    // Add the new order
    orders.unshift(order); // Add to beginning
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    return order;
  } catch (error) {
    console.error('Failed to save order locally:', error);
    return order;
  }
}

export function updateStoredOrder(orderId, updates) {
  try {
    const orders = getStoredOrders();
    const index = orders.findIndex(o => o.id === orderId);
    if (index >= 0) {
      orders[index] = { ...orders[index], ...updates };
      localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
      return orders[index];
    }
    return null;
  } catch (error) {
    console.error('Failed to update order locally:', error);
    return null;
  }
}

export function clearStoredOrders() {
  localStorage.removeItem(ORDERS_KEY);
}
