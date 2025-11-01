import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../lib/api";

export default function Register() {
  const nav = useNavigate();
  const [f, setF] = useState({ name:"", email:"", password:"" });
  const [err, setErr] = useState("");

  async function submit(e){
    e.preventDefault(); setErr("");
    try{
      const { data } = await api.post("/auth/register", f);
      if (data.access) {
        localStorage.setItem("access_token", data.access);
        localStorage.setItem("refresh_token", data.refresh || "");
      }
      nav("/");
    }catch(e){ setErr(e?.response?.data?.message || "Registration failed"); }
  }

  return <div className="max-w-md mx-auto">
    <h1>Register</h1>
    {err && <div>{err}</div>}
    <form onSubmit={submit}>
      <input placeholder="Name" value={f.name} onChange={e=>setF({...f, name:e.target.value})}/>
      <input type="email" placeholder="Email" value={f.email} onChange={e=>setF({...f, email:e.target.value})}/>
      <input type="password" placeholder="Password" value={f.password} onChange={e=>setF({...f, password:e.target.value})}/>
      <button>Sign up</button>
    </form>
    <p>Have an account? <Link to="/login">Login</Link></p>
  </div>;
}
