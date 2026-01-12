// src/api/products.js
import { apiGet, api } from "./client";


function mapSortToOrdering(sort) {
  switch (sort) {
    case "price_asc":
      return "price";
    case "price_desc":
      return "-price";
    case "name_asc":
      return "name";
    case "name_desc":
      return "-name";
    default:
      return "";
  }
}

export async function fetchProducts({
  page = 1,
  limit = 12,
  q = "",
  sort = "",
} = {}) {
  const params = {
    page,
    page_size: limit,
  };

  if (q) {
    params.search = q;
  }

  const ordering = mapSortToOrdering(sort);
  if (ordering) {
    params.ordering = ordering;
  }

  const data = await apiGet("/products/", { params });

  if (Array.isArray(data)) {
    return { items: data, total: data.length };
  }
  if (Array.isArray(data.results)) {
    return { items: data.results, total: data.count ?? data.results.length };
  }
  if (Array.isArray(data.items)) {
    return { items: data.items, total: data.total ?? data.items.length };
  }

  return { items: [], total: 0 };
}


export async function fetchCategories() {
  // Backend exposes categories under the products namespace: /api/products/categories/
  const data = await apiGet("/products/categories/");
  return Array.isArray(data) ? data : data.items ?? data.results ?? [];
}


export async function fetchProductById(id) {
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    throw new Error("Invalid product ID");
  }

  const data = await apiGet(`/products/${numericId}/`);

  if (!data) return null;
  if (Array.isArray(data)) return data[0] ?? null;
  if (Array.isArray(data.results)) return data.results[0] ?? null;

  return data;
}

// Product Management Functions
export async function deleteProduct(productId) {
  const numericId = Number(productId);
  if (!Number.isFinite(numericId)) {
    throw new Error("Invalid product ID");
  }

  const { data } = await api.delete(`/products/${numericId}/`);
  return data;
}

export async function updateProduct(productId, updates) {
  const numericId = Number(productId);
  if (!Number.isFinite(numericId)) {
    throw new Error("Invalid product ID");
  }

  const { data } = await api.patch(`/products/${numericId}/`, updates);
  return data;
}

// Category Management Functions
export async function createCategory(categoryData) {
  const { data } = await api.post("/products/categories/", categoryData);
  return data;
}

export async function deleteCategory(categoryId) {
  // Category IDs are now numeric IDs
  const numericId = Number(categoryId);
  if (!Number.isFinite(numericId)) {
    throw new Error("Invalid category ID");
  }

  const { data } = await api.delete(`/products/categories/${numericId}/`);
  return data;
}
