import api from "../lib/api";
import { USE_MOCK, wait } from "./client";

const mockComments = new Map();
const mockRatings = new Map();

function asNumber(id) {
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) throw new Error("Geçersiz ürün ID");
  return numericId;
}

function ensureMockList(store, productId) {
  if (!store.has(productId)) store.set(productId, []);
  return store.get(productId);
}

function extractMessage(error, fallback = "İşlem başarısız") {
  return (
    error?.response?.data?.detail ||
    error?.response?.data?.message ||
    Array.isArray(error?.response?.data) && error.response.data[0] ||
    error?.message ||
    fallback
  );
}

export async function fetchProductComments(productId) {
  const numericId = asNumber(productId);
  if (USE_MOCK) {
    await wait(60);
    return [...ensureMockList(mockComments, numericId)]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  try {
    const { data } = await api.get(`/products/${numericId}/comments/`);
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    return data?.items ?? [];
  } catch (error) {
    throw new Error(extractMessage(error, "Yorumlar yüklenemedi"));
  }
}

export async function createProductComment(productId, body) {
  const numericId = asNumber(productId);
  if (!body?.trim()) throw new Error("Yorum metni boş olamaz");

  if (USE_MOCK) {
    await wait(80);
    const entry = {
      id: crypto.randomUUID?.() ?? Date.now(),
      product: numericId,
      author: "guest",
      body,
      status: "pending",
      created_at: new Date().toISOString(),
    };
    ensureMockList(mockComments, numericId).push(entry);
    return entry;
  }

  try {
    const { data } = await api.post(`/products/${numericId}/comments/`, { body });
    return data;
  } catch (error) {
    throw new Error(extractMessage(error, "Yorum gönderilemedi"));
  }
}

function buildMockRatingSummary(productId) {
  const list = ensureMockList(mockRatings, productId);
  if (!list.length) return { count: 0, average: 0 };
  const sum = list.reduce((acc, item) => acc + item.score, 0);
  return {
    count: list.length,
    average: Math.round((sum / list.length) * 10) / 10,
  };
}

export async function fetchRatingSummary(productId) {
  const numericId = asNumber(productId);
  if (USE_MOCK) {
    await wait(40);
    return buildMockRatingSummary(numericId);
  }
  // backend currently exposes sadece POST, bu yüzden null döneriz.
  return null;
}

export async function submitProductRating(productId, score) {
  const numericId = asNumber(productId);
  const clamped = Math.min(5, Math.max(1, Number(score)));

  if (USE_MOCK) {
    await wait(50);
    ensureMockList(mockRatings, numericId).push({
      id: crypto.randomUUID?.() ?? Date.now(),
      product: numericId,
      score: clamped,
      created_at: new Date().toISOString(),
    });
    return buildMockRatingSummary(numericId);
  }

  try {
    const { data } = await api.post(`/products/${numericId}/ratings/`, { score: clamped });
    return data;
  } catch (error) {
    throw new Error(extractMessage(error, "Puan gönderilemedi"));
  }
}

