// Utility function to check if current user is an admin
// For now, returns true so everyone can see admin features
// Later, you can change this to check user.is_staff or user.role === 'admin'
// eslint-disable-next-line no-unused-vars
export function isAdmin(user) {
  // TODO: Replace with actual admin check when backend is ready
  // Example: return user?.is_staff === true || user?.role === 'admin';
  return true; // Visible to everyone for now
}

