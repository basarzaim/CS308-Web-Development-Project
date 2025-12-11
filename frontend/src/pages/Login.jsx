// src/pages/Login.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login as loginRequest } from "../services/auth";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const nav = useNavigate();
  const { login } = useAuth(); // AuthContext login
  const [f, setF] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const data = await loginRequest({
        email: f.email,
        password: f.password,
      });

      if (data.access) {
        login(data.access, data.refresh || "");
      }

      nav("/"); 
    } catch (e) {
      const r = e?.response;
      setErr(
        r?.data?.detail ||
          r?.data?.message ||
          e.message ||
          "Login failed"
      );
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
