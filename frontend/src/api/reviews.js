import { api } from "./client";

function asNumber(id) {
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) throw new Error("Invalid product ID");
  return numericId;
}

function ensureMockList(store, productId) {
  if (!store.has(productId)) store.set(productId, []);
  return store.get(productId);
}

function extractMessage(error, fallback = "Operation failed") {
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
  try {
    const { data } = await api.get(`/products/${numericId}/comments/`);
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    return data?.items ?? [];
  } catch (error) {
    throw new Error(extractMessage(error, "Failed to load comments"));
  }
}

export async function createProductComment(productId, body) {
  const numericId = asNumber(productId);
  if (!body?.trim()) throw new Error("Comment text cannot be empty");

  try {
    const { data } = await api.post(`/products/${numericId}/comments/`, { body });
    return data;
  } catch (error) {
    throw new Error(extractMessage(error, "Failed to post comment"));
  }
}

export async function fetchRatingSummary(productId) {
  const numericId = asNumber(productId);

  try {
    const { data } = await api.get(`/products/${numericId}/ratings/`);
    // Expect shape: { average, count, user_rating }
    return {
      average: Number(data?.average ?? 0),
      count: Number(data?.count ?? 0),
      user_rating: data?.user_rating ?? null,
    };
  } catch (error) {
    throw new Error(extractMessage(error, "Failed to load rating summary"));
  }
}

export async function submitProductRating(productId, score) {
  const numericId = asNumber(productId);
  const clamped = Math.min(5, Math.max(1, Number(score)));

  try {
    const { data } = await api.post(`/products/${numericId}/ratings/`, { score: clamped });
    return data;
  } catch (error) {
    throw new Error(extractMessage(error, "Failed to submit rating"));
  }
}

// Admin functions for comment moderation
export async function fetchPendingComments() {
  try {
    const { data } = await api.get("/comments/pending/");
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.items)) return data.items;
    return [];
  } catch (error) {
    throw new Error(extractMessage(error, "Failed to load pending comments"));
  }
}

export async function updateCommentStatus(commentId, status) {
  if (!["pending", "approved", "rejected"].includes(status)) {
    throw new Error("Invalid status. Must be pending, approved, or rejected");
  }

  try {
    const { data } = await api.patch(`/comments/${commentId}/status/`, { status });
    return data;
  } catch (error) {
    throw new Error(extractMessage(error, "Failed to update comment status"));
  }
}

