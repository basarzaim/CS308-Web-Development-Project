// src/pages/ProductList.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchCategories } from "../api/products";
import useDebounce from "../hooks/useDebounce";
import SkeletonGrid from "../components/SkeletonGrid.jsx";
import { toggleWishlist, getWishlist, isInWishlist } from "../stores/wishlist";
import { getProducts } from "../services/products";
import { useAuth } from "../context/AuthContext";
import "./ProductList.css";

// Category list matching backend Product.CATEGORY_CHOICES
const CATEGORY_OPTIONS = [
  { slug: "phones", name: "Phones" },
  { slug: "laptops", name: "Laptops & Ultrabooks" },
  { slug: "tablets", name: "Tablets & E-Readers" },
  { slug: "desktops", name: "Desktops & All-in-Ones" },
  { slug: "monitors", name: "Monitors" },
  { slug: "components", name: "PC Components" },
  { slug: "peripherals", name: "Keyboards, Mice & Input" },
  { slug: "networking", name: "Networking & Modems" },
  { slug: "audio", name: "Headphones & Speakers" },
  { slug: "tv_video", name: "TV & Video" },
  { slug: "gaming", name: "Gaming Consoles & Accessories" },
  { slug: "smart_home", name: "Smart Home" },
  { slug: "wearables", name: "Wearables" },
  { slug: "storage", name: "External Storage & SSD/HDD" },
  { slug: "printers", name: "Printers & Scanners" },
  { slug: "accessories", name: "Cables & Accessories" },
  { slug: "drones", name: "Drones" },
  { slug: "photo_video", name: "Cameras & Photo" },
];

export default function ProductList() {
  const { isAuthenticated } = useAuth();
  // UI state
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 350);
  const [category, setCategory] = useState(""); // slug
  const [sort, setSort] = useState("featured");
  const [pageSize, setPageSize] = useState(12);
  const [page, setPage] = useState(1);
  const [wishlistItems, setWishlistItems] = useState(new Set());
  const [wishlistLoading, setWishlistLoading] = useState(true);
  const [error, setError] = useState(null);

  // data state
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  // Category product counts (fetched from API, merged with static list)
  const [categoryCounts, setCategoryCounts] = useState({});

  // Backend ordering key map
  const getBackendOrdering = (sortKey) => {
    switch (sortKey) {
      case "price-asc":
        return "price";
      case "price-desc":
        return "-price";
      case "rating-desc":
        return "-rating"; // Backend'de 'rating' alanı varsa
      case "name-asc":
        return "name"; // Backend'de 'name' alanı varsa
      case "name-desc":
        return "-name";
      default:
        return ""; // featured durumu
    }
  };

  // Load wishlist on mount and when auth changes
  useEffect(() => {
    async function loadWishlist() {
      setWishlistLoading(true);
      try {
        const items = await getWishlist();
        setWishlistItems(new Set(items.map(String)));
      } catch (err) {
        console.error("Error loading wishlist:", err);
        setWishlistItems(new Set());
      } finally {
        setWishlistLoading(false);
      }
    }
    loadWishlist();
  }, [isAuthenticated]);

  // Fetch category product counts (optional - for displaying counts)
  useEffect(() => {
    let ignore = false;
    fetchCategories()
      .then((d) => {
        const raw = d?.results || d || [];
        const counts = {};
        raw.forEach((c) => {
          if (c.slug) {
            counts[c.slug] = c.product_count || 0;
          }
        });
        if (!ignore) setCategoryCounts(counts);
      })
      .catch((err) => {
        console.error("Error fetching category counts:", err);
        // Continue with empty counts - categories will still show
      });
    return () => {
      ignore = true;
    };
  }, []);

  // fetch products
  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(null);

    const params = {
      page,
      page_size: pageSize, // DRF standard
      search: debounced || undefined,
      category: category || undefined,
      ordering: getBackendOrdering(sort) || undefined,
    };

    getProducts(params)
      .then((data) => {
        if (ignore) return;

        // DRF: { count, results: [...] }
        if (data && Array.isArray(data.results)) {
          setItems(data.results);
          setTotal(typeof data.count === "number" ? data.count : data.results.length);
        }
        // Direkt array dönerse (pagination yok)
        else if (Array.isArray(data)) {
          setItems(data);
          setTotal(data.length);
        }
        // Beklenmedik format
        else {
          console.error("Unexpected products response format:", data);
          setItems([]);
          setTotal(0);
        }
      })
      .catch((err) => {
        console.error("Error fetching products:", err);
        if (!ignore) {
          setItems([]);
          setTotal(0);
          setError("Products could not be loaded. Please try again later.");
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [page, pageSize, debounced, category, sort]);

  const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize));

  // Pagination helper
  const go = (n) => setPage(Math.min(Math.max(1, n), totalPages));

  // Wishlist toggle handler
  const handleToggleWishlist = async (productId) => {
    const idStr = String(productId);
    const currentState = wishlistItems.has(idStr);
    
    // Store original state for potential revert
    const originalSet = new Set(wishlistItems);
    
    // Optimistically update UI
    const newSet = new Set(wishlistItems);
    if (currentState) {
      newSet.delete(idStr);
    } else {
      newSet.add(idStr);
    }
    setWishlistItems(newSet);

    try {
      // Toggle with current state to avoid unnecessary API call
      const newState = await toggleWishlist(productId, currentState);
      // Update state based on result (in case of error, it might have reverted)
      if (newState !== undefined) {
        const finalSet = new Set(originalSet);
        if (newState) {
          finalSet.add(idStr);
        } else {
          finalSet.delete(idStr);
        }
        setWishlistItems(finalSet);
      }
    } catch (err) {
      console.error("Error toggling wishlist:", err);
      // Revert optimistic update on error
      setWishlistItems(originalSet);
      // Optionally refresh from server to get accurate state
      try {
        const items = await getWishlist();
        setWishlistItems(new Set(items.map(String)));
      } catch (refreshErr) {
        console.error("Error refreshing wishlist:", refreshErr);
      }
    }
  };

  if (loading) {
    // İstersen burayı değiştirebiliriz ama şimdilik tüm sayfa skeleton
    return <SkeletonGrid count={pageSize} />;
  }

  return (
    <div className="pl-container">
      {/* Hata mesajı */}
      {error && <div className="pl-error">{error}</div>}

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
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <div className="pl-main-layout">
        {/* Left Sidebar - Filters */}
        <aside className="pl-sidebar">
          <div className="pl-sidebar-header">
            <h3>Filters</h3>
            {category && (
              <button
                className="pl-clear-filters"
                onClick={() => {
                  setCategory("");
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
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All categories</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                    {categoryCounts[c.slug] != null ? ` (${categoryCounts[c.slug]})` : ""}
                  </option>
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
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(1);
                }}
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
                onChange={(e) => {
                  const val = Number(e.target.value) || 12;
                  setPageSize(val);
                  setPage(1);
                }}
              >
                {[8, 12, 16, 24, 36].map((n) => (
                  <option key={n} value={n}>
                    {n} per page
                  </option>
                ))}
              </select>
            </label>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="pl-content-area">
          {/* Header */}
          <header className="pl-header">
            <h2 className="pl-title">
              Products <span className="pl-count">{total}</span>
            </h2>
          </header>

          {/* Grid */}
          {items.length === 0 ? (
            <div className="pl-empty">No results found. Try adjusting your filters.</div>
          ) : (
            <section className="pl-grid">
              {items.map((p) => {
                const idStr = String(p.id);
                const inWishlist = wishlistItems.has(idStr);

                return (
                  <div key={p.id} className="pl-card-wrapper">
                    <Link
                      className="pl-card"
                      to={`/product/${p.id}`}
                      aria-label={`Open ${p.name} detail page`}
                    >
                      <img
                        className="pl-thumb"
                        src={p.image || p.image_url}
                        alt={p.name}
                        loading="lazy"
                      />
                      <div className="pl-content">
                        <h3 className="pl-name" title={p.name}>
                          {p.name}
                        </h3>
                        <div className="pl-meta">
                          <span className="pl-price">
                            ${Number(p.price || 0).toFixed(2)}
                          </span>
                          {p.rating != null && (
                            <span className="pl-rating">⭐ {p.rating}</span>
                          )}
                        </div>
                      </div>
                    </Link>

                    <button
                      className={`pl-wishlist-btn ${inWishlist ? "active" : ""}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleToggleWishlist(p.id);
                      }}
                      aria-label={
                        inWishlist ? "Remove from wishlist" : "Add to wishlist"
                      }
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill={inWishlist ? "#FF0066" : "none"}
                        stroke="#FF0066"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                      </svg>
                    </button>
                  </div>
                );
              })}
            </section>
          )}

          {/* Pager */}
          <nav className="pl-pager" aria-label="Pagination">
            <button
              className="pl-btn"
              disabled={page <= 1}
              onClick={() => go(page - 1)}
            >
              ‹
            </button>
            <span className="pl-pageinfo">
              {page} / {totalPages}
            </span>
            <button
              className="pl-btn"
              disabled={page >= totalPages}
              onClick={() => go(page + 1)}
            >
              ›
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
