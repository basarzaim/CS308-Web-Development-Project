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
  const [brand, setBrand] = useState("");
  const [color, setColor] = useState("");
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

  // Get unique brands and colors from products
  const availableBrands = useMemo(() => {
    const brands = new Set();
    items.forEach(p => {
      if (p.brand) brands.add(p.brand);
    });
    return Array.from(brands).sort();
  }, [items]);

  const availableColors = useMemo(() => {
    const colors = [
      "Black", "White", "Red", "Blue", "Green", "Yellow", "Orange", 
      "Purple", "Pink", "Gray", "Brown", "Silver", "Gold"
    ];
    return colors;
  }, []);

  // optional client-side category filter + sort
  const filtered = useMemo(() => {
    let list = [...items];
    
    // Apply category filter
    if (category) {
      list = list.filter((p) => (p.category?.slug || p.category) === category);
    }
    
    // Apply brand filter
    if (brand) {
      list = list.filter((p) => p.brand === brand);
    }
    
    // Apply color filter (for now, we'll filter by name containing color - in real app, products would have color field)
    if (color) {
      list = list.filter((p) => {
        const nameLower = (p.name || "").toLowerCase();
        return nameLower.includes(color.toLowerCase());
      });
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
  }, [items, category, brand, color, sort]);

  const totalPages = Math.max(1, Math.ceil((category || brand || color ? filtered.length : total) / pageSize));

  // pagination helper
  const go = (n) => setPage(Math.min(Math.max(1, n), totalPages));

  if (loading) return <SkeletonGrid count={pageSize} />;

  return (
    <div className="pl-container">
      {/* Search Bar - Centered at Top */}
      <div className="pl-search-container">
        <div className="pl-search-wrapper">
          <svg 
            className="pl-search-icon" 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="#FF9500" 
            strokeWidth="2.5"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            className="pl-input"
            placeholder="Search for products, brands, and more..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <div className="pl-main-layout">
        {/* Left Sidebar - Filters */}
        <aside className="pl-sidebar">
          <div className="pl-sidebar-header">
            <h3>Filters</h3>
            {(category || brand || color) && (
              <button 
                className="pl-clear-filters"
                onClick={() => {
                  setCategory("");
                  setBrand("");
                  setColor("");
                  setPage(1);
                }}
              >
                Clear all
              </button>
            )}
          </div>

          <div className="pl-filter-section">
            <label className="pl-filter-label">
              <span>Category</span>
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
            </label>
          </div>

          <div className="pl-filter-section">
            <label className="pl-filter-label">
              <span>Brand</span>
              <select
                className="pl-select"
                value={brand}
                onChange={(e) => { setBrand(e.target.value); setPage(1); }}
              >
                <option value="">All brands</option>
                {availableBrands.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="pl-filter-section">
            <label className="pl-filter-label">
              <span>Color</span>
              <select
                className="pl-select"
                value={color}
                onChange={(e) => { setColor(e.target.value); setPage(1); }}
              >
                <option value="">All colors</option>
                {availableColors.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="pl-filter-section">
            <label className="pl-filter-label">
              <span>Sort by</span>
              <select
                className="pl-select"
                value={sort}
                onChange={(e) => { setSort(e.target.value); setPage(1); }}
              >
                <option value="featured">Featured</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name-asc">Name: A → Z</option>
                <option value="name-desc">Name: Z → A</option>
                <option value="rating-desc">Rating: Highest</option>
              </select>
            </label>
          </div>

          <div className="pl-filter-section">
            <label className="pl-filter-label">
              <span>Show</span>
              <select
                className="pl-select"
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              >
                {[8, 12, 16, 24, 36].map((n) => (
                  <option key={n} value={n}>{n} per page</option>
                ))}
              </select>
            </label>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="pl-content-area">
          {/* Header */}
          <header className="pl-header">
            <h2 className="pl-title">Products <span className="pl-count">{category ? filtered.length : total}</span></h2>
          </header>

          {/* Grid */}
          {filtered.length === 0 ? (
            <div className="pl-empty">No results found. Try adjusting your filters.</div>
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
      </div>
    </div>
  );
}
