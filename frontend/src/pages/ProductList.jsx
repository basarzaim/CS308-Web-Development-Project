// src/pages/ProductList.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchProducts, fetchCategories } from "../api/products";
import useDebounce from "../hooks/useDebounce";
import SkeletonGrid from "../components/SkeletonGrid.jsx";
import "./ProductList.css";

export default function ProductList() {
  // UI state
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 350);
  const [category, setCategory] = useState("");   // slug
  const [sort, setSort] = useState("featured");
  const [pageSize, setPageSize] = useState(12);
  const [page, setPage] = useState(1);

  // data state
  const [cats, setCats] = useState([]);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // fetch categories
  useEffect(() => {
    let ignore = false;
    fetchCategories()
      .then((d) => {
        const list = (d?.results || d || []).map((c, i) => ({
          slug: c.slug ?? String(c.id ?? i + 1),
          name: c.name ?? String(c.slug ?? `Cat ${i + 1}`),
          product_count: c.product_count,
        }));
        if (!ignore) setCats(list);
      })
      .catch(() => {});
    return () => { ignore = true; };
  }, []);

  // fetch products
  useEffect(() => {
    setLoading(true);
    fetchProducts({ page, limit: pageSize, q: debounced })
      .then(({ items, total }) => {
        setItems(items || []);
        setTotal(Number(total) || 0);
      })
      .catch(() => {
        // keep UI simple; suppress specific error messages
        setItems([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [page, pageSize, debounced]);

  // optional client-side category filter + sort
  const filtered = useMemo(() => {
    let list = [...items];
    
    // Apply category filter
    if (category) {
      list = list.filter((p) => (p.category?.slug || p.category) === category);
    }
    
    // Apply sorting
    switch (sort) {
      case "price-asc":
        list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
        break;
      case "price-desc":
        list.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
        break;
      case "name-asc":
        list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        break;
      case "name-desc":
        list.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
        break;
      case "rating-desc":
        list.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
        break;
      default:
        // "featured" - keep original order
        break;
    }
    
    return list;
  }, [items, category, sort]);

  const totalPages = Math.max(1, Math.ceil((category ? filtered.length : total) / pageSize));

  // pagination helper
  const go = (n) => setPage(Math.min(Math.max(1, n), totalPages));

  if (loading) return <SkeletonGrid count={pageSize} />;

  return (
    <div className="pl-container">
      {/* Toolbar */}
      <div className="pl-toolbar">
        <input
          className="pl-input"
          placeholder="Search products…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />

        <select
          className="pl-select"
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
        >
          <option value="">All categories</option>
          {cats.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}{c.product_count != null ? ` (${c.product_count})` : ""}
            </option>
          ))}
        </select>

        <select
          className="pl-select"
          value={sort}
          onChange={(e) => { setSort(e.target.value); setPage(1); }}
        >
          <option value="featured">Sort: Featured</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="name-asc">Name: A → Z</option>
          <option value="name-desc">Name: Z → A</option>
          <option value="rating-desc">Rating: Highest</option>
        </select>

        <select
          className="pl-select"
          value={pageSize}
          onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
        >
          {[8, 12, 16, 24, 36].map((n) => (
            <option key={n} value={n}>{n}/page</option>
          ))}
        </select>
      </div>

      {/* Header */}
      <header className="pl-header">
        <h2 className="pl-title">Products <span className="pl-count">{total}</span></h2>
      </header>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="pl-empty">No results.</div>
      ) : (
        <section className="pl-grid">
          {filtered.map((p) => (
            <Link
              key={p.id}
              className="pl-card"
              to={`/product/${p.id}`}
              aria-label={`Open ${p.name} detail page`}
            >
              <img className="pl-thumb" src={p.image || p.image_url} alt={p.name} loading="lazy" />
              <div className="pl-content">
                <h3 className="pl-name" title={p.name}>{p.name}</h3>
                <div className="pl-meta">
                  <span className="pl-price">
                    ${Number(p.price).toFixed(2)}
                  </span>
                  {p.rating != null && <span className="pl-rating">⭐ {p.rating}</span>}
                </div>
              </div>
            </Link>
          ))}
        </section>
      )}

      {/* Pager */}
      <nav className="pl-pager" aria-label="Pagination">
        <button className="pl-btn" disabled={page <= 1} onClick={() => go(page - 1)}>‹</button>
        <span className="pl-pageinfo">{page} / {totalPages}</span>
        <button className="pl-btn" disabled={page >= totalPages} onClick={() => go(page + 1)}>›</button>
      </nav>
    </div>
  );
}
