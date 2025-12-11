import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import useDebounce from "../hooks/useDebounce";

export default function Catalog() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("featured");
  const debouncedSearch = useDebounce(search, 350);

  // Backend ordering key map
  const getBackendOrdering = (sortKey) => {
    switch (sortKey) {
      case "price-asc":
        return "price";
      case "price-desc":
        return "-price";
      case "name-asc":
        return "name";
      case "name-desc":
        return "-name";
      case "stock":
        return "-stock";
      default:
        return "";
    }
  };

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setErr("");

    const params = {
      search: debouncedSearch || undefined,
      ordering: getBackendOrdering(sort) || undefined,
    };

    api.get("/products/", { params })
      .then(({ data }) => {
        if (ignore) return;
        setItems(Array.isArray(data) ? data : data.results ?? []);
      })
      .catch(() => {
        if (!ignore) setErr("Failed to load products.");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [debouncedSearch, sort]);

  return (
    <div className="catalog-page">
      <div className="catalog-controls">
        <input
          type="search"
          placeholder="Search products"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="featured">Featured</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="name-asc">Name: A → Z</option>
          <option value="name-desc">Name: Z → A</option>
          <option value="stock">Stock: High to Low</option>
        </select>
      </div>

      {err && <div className="catalog-feedback catalog-feedback--error">{err}</div>}
      {loading ? (
        <div className="catalog-feedback">Loading products…</div>
      ) : items.length === 0 ? (
        <div className="catalog-feedback">No products match your search.</div>
      ) : (
        <div className="catalog-grid">
          {items.map((p) => (
            <Card key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function Card({ p }) {
  const color =
    p.stock <= 0 ? "crimson" : p.stock < 5 ? "darkorange" : "seagreen";
  const label =
    p.stock <= 0
      ? "Out of stock"
      : p.stock < 5
      ? `Low stock: ${p.stock}`
      : `In stock: ${p.stock}`;
  return (
    <Link to={`/product/${p.id}`} className="catalog-card">
      <div className="catalog-card__title">{p.name}</div>
      <div className="catalog-card__price">${Number(p.price).toFixed(2)}</div>
      <div className="catalog-card__stock" style={{ color }}>
        {label}
      </div>
    </Link>
  );
}
