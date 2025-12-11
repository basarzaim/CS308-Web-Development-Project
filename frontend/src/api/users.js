import { api, USE_MOCK, wait } from "./client";

const mockUser = {
  id: 1,
  email: "user@example.com",
  username: "mockuser",
  first_name: "John",
  last_name: "Doe",
  phone: "555-1234",
  address: "123 Main St, New York, NY 10001"
};

function extractMessage(error, fallback = "An error occurred") {
  return (
    error?.response?.data?.detail ||
    error?.response?.data?.message ||
    (Array.isArray(error?.response?.data) ? error.response.data[0] : null) ||
    error?.message ||
    fallback
  );
}

export async function fetchCurrentUser() {
  if (USE_MOCK) {
    await wait(150);
    return mockUser;
  }

  try {
    const { data } = await api.get("/users/me/");
    return data;
  } catch (error) {
    throw new Error(extractMessage(error, "Unable to fetch user profile"));
  }
}

export async function updateUserProfile(updates) {
  if (USE_MOCK) {
    await wait(200);
    Object.assign(mockUser, updates);
    return mockUser;
  }

  try {
    const { data } = await api.patch("/users/me/", updates);
    return data;
  } catch (error) {
    throw new Error(extractMessage(error, "Unable to update profile"));
  }
}
