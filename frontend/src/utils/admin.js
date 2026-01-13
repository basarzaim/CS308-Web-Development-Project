// Utility helpers for role-based access in the frontend
// These functions mirror backend role expectations without changing backend logic.

// Utility function to check if current user is an admin-like user
// Admins include Django staff and specific manager roles.
export function isAdmin(user) {
  if (!user) return false;

  // Check if user is staff (Django admin)
  if (user.is_staff === true) return true;

  // Check if user has Product Manager or Sales Manager role
  if (user.role === "Product Manager" || user.role === "Sales Manager" || user.role === "Support Agent") return true;

  return false;
}

// Role-based permission checks
export function isProductManager(user) {
  if (!user) return false;
  return user.is_staff === true || user.role === 'Product Manager';
}

export function isSalesManager(user) {
  if (!user) return false;
  return user.is_staff === true || user.role === 'Sales Manager';
}

export function isSupportAgent(user) {
  if (!user) return false;
  return user.is_staff === true || user.role === 'Support Agent';
}

// Feature-specific permission checks
export function canAccessComments(user) {
  return isProductManager(user);
}

export function canAccessOrders(user) {
  return isProductManager(user);
}

export function canAccessStock(user) {
  return isProductManager(user);
}

export function canAccessAnalytics(user) {
  return isSalesManager(user);
}

export function canAccessDiscounts(user) {
  return isSalesManager(user);
}

export function canAccessSupportChat(user) {
  return isSupportAgent(user);
}

