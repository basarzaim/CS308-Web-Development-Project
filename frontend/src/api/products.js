// src/api/products.js
import { apiGet, USE_MOCK, wait } from "./client";

// ---- MOCK DATA ----
const MOCK_PRODUCTS = Array.from({ length: 60 }).map((_, i) => ({
  id: i + 1,
  name: `Product ${i + 1}`,
  slug: `product-${i + 1}`,
  description: "Description",
  price: 1000 + i * 50,
  currency: "USD",
  image: `https://picsum.photos/seed/${i + 1}/400/300`,
  image_url: `https://picsum.photos/seed/${i + 1}/400/300`,
  category: {
    name: ["Phone", "Laptop", "Headphones", "Accessory"][i % 4],
    slug: ["phone", "laptop", "headphones", "accessory"][i % 4],
  },
  brand: ["BrandA", "BrandB", "BrandC"][i % 3],
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
    // Real backend
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
    console.warn("API failed, falling back to mock data:", e);
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
  if (!Number.isFinite(numericId)) throw new Error("Invalid product ID");

  async function getFromMock() {
    await wait(80);
    const mock = findMockProductById(numericId);
    if (!mock) throw new Error("Product not found");
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
    console.warn("Real product could not be fetched, falling back to mock data:", lastErr);
    return mockFallback;
  }

  throw lastErr ?? new Error("Product could not be fetched");
}