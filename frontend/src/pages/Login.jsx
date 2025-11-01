import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../lib/api";
import { mergeGuestCartIfAny } from "../stores/cart";

export default function Login(){
  const nav = useNavigate();
  const [f, setF] = useState({ email:"", password:"" });
  const [err, setErr] = useState("");

  async function submit(e){
    e.preventDefault(); setErr("");
    try{
      const { data } = await api.post("/auth/login", f);
      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh || "");
      await mergeGuestCartIfAny();
      nav("/");
    }catch(e){ setErr(e?.response?.data?.detail || "Login failed"); }
  }

  return <div className="max-w-md mx-auto">
    <h1>Login</h1>
    {err && <div>{err}</div>}
    <form onSubmit={submit}>
      <input type="email" placeholder="Email" value={f.email} onChange={e=>setF({...f, email:e.target.value})}/>
      <input type="password" placeholder="Password" value={f.password} onChange={e=>setF({...f, password:e.target.value})}/>
      <button>Login</button>
    </form>
    <p>No account? <Link to="/register">Register</Link></p>
  </div>;
}
