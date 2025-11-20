// src/api/products.js
import { apiGet, USE_MOCK, wait } from "./client";

// ---- MOCK DATA ----
const MOCK_PRODUCTS = Array.from({ length: 60 }).map((_, i) => ({
  id: i + 1,
  name: `Ürün ${i + 1}`,
  slug: `urun-${i + 1}`,
  description: "Açıklama",
  price: 1000 + i * 50,
  currency: "TRY",
  image: `https://picsum.photos/seed/${i + 1}/400/300`,    // ProductList için "image"
  image_url: `https://picsum.photos/seed/${i + 1}/400/300`, // başka yerde image_url gerekirse
  category: {
    name: ["telefon", "laptop", "kulaklık", "aksesuar"][i % 4],
    slug: ["telefon", "laptop", "kulaklik", "aksesuar"][i % 4],
  },
  brand: ["MarkaA", "MarkaB", "MarkaC"][i % 3],
  rating: Math.round((Math.random() * 2.5 + 2.5) * 10) / 10,
  stock: i % 5 === 0 ? 0 : 10,
}));

function filterAndSort(items, { q = "", sort = "" }) {
  let data = items;
  if (q) {
    const s = q.toLowerCase();
    data = data.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        (p.brand && p.brand.toLowerCase().includes(s))
    );
  }
  if (sort === "price_asc") data = [...data].sort((a, b) => a.price - b.price);
  if (sort === "price_desc") data = [...data].sort((a, b) => b.price - a.price);
  return data;
}

function paginate(arr, page, limit) {
  const start = (page - 1) * limit;
  return arr.slice(start, start + limit);
}

export async function fetchProducts({ page = 1, limit = 12, q = "", sort = "" } = {}) {
  try {
    if (USE_MOCK) {
      await wait(120);
      const filtered = filterAndSort(MOCK_PRODUCTS, { q, sort });
      return { items: paginate(filtered, page, limit), total: filtered.length };
    }
    // Gerçek backend
    const data = await apiGet("/products", { params: { page, limit, q, sort } });
    return {
      items: data.items ?? data,
      total:
        data.total ??
        (Array.isArray(data.items)
          ? data.items.length
          : Array.isArray(data)
          ? data.length
          : 0),
    };
  } catch (e) {
    console.warn("API başarısız oldu, MOCK'a düşüyoruz:", e);
    const filtered = filterAndSort(MOCK_PRODUCTS, { q, sort });
    return { items: paginate(filtered, page, limit), total: filtered.length };
  }
}

export async function fetchCategories() {
  try {
    if (USE_MOCK) {
      const map = new Map();
      for (const p of MOCK_PRODUCTS) map.set(p.category.slug, p.category.name);
      return Array.from(map, ([slug, name], idx) => ({ id: idx + 1, slug, name }));
    }
    const data = await apiGet("/categories");
    return data.items ?? data;
  } catch {
    const map = new Map();
    for (const p of MOCK_PRODUCTS) map.set(p.category.slug, p.category.name);
    return Array.from(map, ([slug, name], idx) => ({ id: idx + 1, slug, name }));
  }
}

function normalizeProductResponse(data) {
  if (!data) return null;
  if (Array.isArray(data)) return data[0] ?? null;
  if (Array.isArray(data.results)) return data.results[0] ?? null;
  return data;
}

function findMockProductById(id) {
  const numericId = Number(id);
  return MOCK_PRODUCTS.find((p) => p.id === numericId);
}

export async function fetchProductById(id) {
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) throw new Error("Geçersiz ürün ID");

  async function getFromMock() {
    await wait(80);
    const mock = findMockProductById(numericId);
    if (!mock) throw new Error("Ürün bulunamadı");
    return mock;
  }

  if (USE_MOCK) return getFromMock();

  const endpointsToTry = [
    `/products/${numericId}/`,
    `/products/${numericId}`,
    `/products/products/${numericId}/`,
  ];

  let lastErr = null;
  for (const path of endpointsToTry) {
    try {
      const data = await apiGet(path);
      const normalized = normalizeProductResponse(data);
      if (normalized) return normalized;
    } catch (err) {
      lastErr = err;
    }
  }

  const mockFallback = findMockProductById(numericId);
  if (mockFallback) {
    console.warn("Gerçek ürün alınamadı, mock'a düşüldü:", lastErr);
    return mockFallback;
  }

  throw lastErr ?? new Error("Ürün alınamadı");
}