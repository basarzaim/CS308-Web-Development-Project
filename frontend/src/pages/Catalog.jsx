import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";

export default function Catalog() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => { (async () => {
    try {
      const { data } = await api.get("/products/");  // note trailing slash
      setItems(Array.isArray(data) ? data : (data.results ?? []));
    } catch (e) { setErr("Failed to load products"); }
  })(); }, []);

  if (err) return <div style={{ color: "crimson" }}>{err}</div>;

  return (
    <div style={{display:"grid",gap:12,gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",padding:12}}>
      {items.map(p => <Card key={p.id} p={p} />)}
    </div>
  );
}

function Card({ p }) {
  const color = p.stock<=0 ? "crimson" : p.stock<5 ? "darkorange" : "seagreen";
  const label = p.stock<=0 ? "Out of stock" : p.stock<5 ? `Low stock: ${p.stock}` : `In stock: ${p.stock}`;
  return (
    <Link to={`/product/${p.id}`} className="card" style={{border:"1px solid #eee",borderRadius:8,padding:12,textDecoration:"none",color:"inherit"}}>
      <div style={{fontWeight:600}}>{p.name}</div>
      <div>${Number(p.price).toFixed(2)}</div>
      <div style={{fontSize:12,color}}>{label}</div>
    </Link>
  );
}
