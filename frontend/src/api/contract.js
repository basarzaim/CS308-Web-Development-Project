// Frontend iç parametre -> backend query anahtar eşleşmesi
export const PARAM_KEYS = {
  page: 'page',
  page_size: 'page_size',
  search: 'search',
  category: 'category',
  brand: 'brand',            // ← eklendi
  min_price: 'min_price',
  max_price: 'max_price',
  in_stock: 'in_stock',
  ordering: 'ordering',
};

// Query string inşası (null/boşları atar, in_stock true ise gönderir)
export function buildQuery(params = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '' || (k !== 'in_stock' && v === false)) continue;
    const key = PARAM_KEYS[k] ?? k;
    if (k === 'in_stock') { if (v) qs.set(key, 'true'); }
    else qs.set(key, String(v));
  }
  return qs.toString();
}

// Backend ürününü UI modeline çevir
export function decodeProduct(raw = {}) {
  const cat = raw.category ?? { name: raw.category_name, slug: raw.category_slug, id: raw.category_id };
  return {
    id: raw.id ?? raw.product_id,
    name: raw.name ?? raw.title ?? '',
    slug: raw.slug ?? raw.handle ?? '',
    description: raw.description ?? '',
    price: Number(raw.price ?? raw.unit_price ?? 0),
    currency: raw.currency ?? 'TRY',
    image_url: raw.image_url ?? raw.image ?? raw.thumbnail ?? '',
    category: { name: cat?.name ?? '', slug: cat?.slug ?? (cat?.id ? String(cat.id) : '') },
    brand: raw.brand ?? '',
    rating: Number(raw.rating ?? raw.stars ?? 0),
    stock: Number(raw.stock ?? raw.quantity ?? 0),
  };
}

// Liste yanıtını normalize et
export function decodeListResponse(json = {}) {
  const resultsRaw = json.results ?? json.items ?? [];
  const results = resultsRaw.map(decodeProduct);
  const count = json.count ?? json.total ?? results.length;
  const page_size = json.page_size ?? json.limit ?? (results.length || 12);
  const page = json.page ?? (json.offset != null ? Math.floor(json.offset / page_size) + 1 : 1);
  const total_pages = json.total_pages ?? Math.max(1, Math.ceil(count / page_size));
  return { results, count, page, page_size, total_pages };
}
