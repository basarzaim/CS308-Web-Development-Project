import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../lib/api";

export default function Login() {
  const nav = useNavigate();
  const [f, setF] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login/", {
        email: f.email,
        password: f.password,
      });
      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh || "");
      nav("/");
    } catch (e) {
      const r = e?.response;
      setErr(r?.data?.detail || r?.data?.message || e.message || "Login failed");
      console.error("LOGIN ERROR:", r?.status, r?.data || e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "24px auto", padding: 16 }}>
      <h1>Login</h1>
      {err && <div style={{ color: "crimson", marginBottom: 8 }}>{err}</div>}
      <form onSubmit={onSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={f.email}
          onChange={(e) => setF({ ...f, email: e.target.value })}
          style={{ display: "block", width: "100%", marginBottom: 8 }}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={f.password}
          onChange={(e) => setF({ ...f, password: e.target.value })}
          style={{ display: "block", width: "100%", marginBottom: 8 }}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
      <p style={{ marginTop: 8 }}>
        No account? <Link to="/register">Register</Link>
      </p>
    </div>
  );
}
