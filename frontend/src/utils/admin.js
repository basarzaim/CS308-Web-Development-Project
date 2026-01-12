// Utility helpers for role-based access in the frontend
// These functions mirror backend role expectations without changing backend logic.

// Strict Product Manager check based on explicit role string
export function isProductManager(user) {
  if (!user) return false;
  return user.role === "Product Manager";
}

// Strict Sales Manager check based on explicit role string
export function isSalesManager(user) {
  if (!user) return false;
  return user.role === "Sales Manager";
}

// Utility function to check if current user is an admin-like user
// Admins include Django staff and specific manager roles.
export function isAdmin(user) {
  if (!user) return false;

  // Check if user is staff (Django admin)
  if (user.is_staff === true) return true;

  // Check if user has Product Manager or Sales Manager role
  if (user.role === "Product Manager" || user.role === "Sales Manager") return true;

  return false;
}

