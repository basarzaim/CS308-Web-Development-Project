import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../lib/api";

export default function Register() {
  const nav = useNavigate();
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      const { data } = await api.post("/auth/register", f);
      if (data?.access) {
        localStorage.setItem("access_token", data.access);
        localStorage.setItem("refresh_token", data.refresh || "");
      }
      nav("/");
    } catch (e) {
      const r = e?.response;
      const msg =
        r?.data?.message ||
        r?.data?.detail ||
        (typeof r?.data === "string" ? r.data : JSON.stringify(r?.data)) ||
        e.message;
      setErr(msg);
      console.error("REGISTER ERROR:", r?.status, r?.data);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "24px auto", padding: 16 }}>
      <h1>Register</h1>
      {err && <div style={{ color: "crimson", marginBottom: 8 }}>{err}</div>}
      <form onSubmit={onSubmit} className="flex-col">
        <input
          placeholder="Name"
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
        /><br/>
        <input
          type="email"
          placeholder="Email"
          value={f.email}
          onChange={(e) => setF({ ...f, email: e.target.value })}
        /><br/>
        <input
          type="password"
          placeholder="Password"
          value={f.password}
          onChange={(e) => setF({ ...f, password: e.target.value })}
        /><br/>
        <button type="submit">Create account</button>
      </form>
      <p style={{ marginTop: 8 }}>
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}
