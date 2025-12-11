// src/services/auth.js
import { api } from "../api/client";


// Login
export async function login(credentials) {
  // credentials = { email, password } / { username, password }
  const response = await api.post("/auth/login/", credentials);
  return response.data;
}

// Register
export async function register(data) {
  // data = { email, password, ... }
  const response = await api.post("/auth/register/", data);
  return response.data;
}

// Profil info 
export async function getProfile() {
  const response = await api.get("/users/profile/");
  return response.data;
}

export async function updateProfile(payload) {
  const res = await api.put("/users/profile/", payload);
  return res.data;
}
