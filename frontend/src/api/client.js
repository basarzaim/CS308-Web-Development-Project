// src/api/client.js
import axios from "axios";

export const USE_MOCK = (import.meta.env.VITE_USE_MOCK ?? "true") === "true";

// Gerçek API'ye bağlanacaksan .env'de VITE_API_URL ayarlayabilirsin.
// Yoksa /api proxy'si varsayılır.
const baseURL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

export async function apiGet(url, config) {
  const res = await api.get(url, config);
  return res.data;
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
