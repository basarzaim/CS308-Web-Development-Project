import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";

export default function Catalog() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("featured");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const { data } = await api.get("/products/"); // note trailing slash
        setItems(Array.isArray(data) ? data : data.results ?? []);
      } catch {
        setErr("Failed to load products.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredItems = useMemo(() => {
    let list = [...items];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (item) =>
          item.name?.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q)
      );
    }

    switch (sort) {
      case "price-asc":
        list.sort((a, b) => Number(a.price) - Number(b.price));
        break;
      case "price-desc":
        list.sort((a, b) => Number(b.price) - Number(a.price));
        break;
      case "name-asc":
        list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        break;
      case "name-desc":
        list.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
        break;
      case "stock":
        list.sort((a, b) => Number(b.stock ?? 0) - Number(a.stock ?? 0));
        break;
      default:
        break;
    }

    return list;
  }, [items, search, sort]);

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
      ) : filteredItems.length === 0 ? (
        <div className="catalog-feedback">No products match your search.</div>
      ) : (
        <div className="catalog-grid">
          {filteredItems.map((p) => (
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
