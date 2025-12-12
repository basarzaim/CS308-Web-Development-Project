// Utility function to check if current user is an admin
// Checks if user has staff privileges or specific admin roles
export function isAdmin(user) {
  if (!user) return false;

  // Check if user is staff (Django admin)
  if (user.is_staff === true) return true;

  // Check if user has Product Manager or Sales Manager role
  if (user.role === 'Product Manager' || user.role === 'Sales Manager') return true;

  return false;
}

