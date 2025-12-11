// Utility function to check if current user is an admin
export function isAdmin(user) {
  return user?.is_staff === true;
}

