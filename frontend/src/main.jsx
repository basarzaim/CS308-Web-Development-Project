import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Catalog from "./pages/Catalog.jsx";   // will add next
import Product from "./pages/Product.jsx";   // optional for now

function Nav() {
  const loggedIn = !!localStorage.getItem("access_token");
  function logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    location.href = "/"; // simple refresh
  }
  return (
    <nav style={{display:"flex", gap:12, padding:12, borderBottom:"1px solid #eee"}}>
      <Link to="/">Home</Link>
      <Link to="/cart">Cart</Link>
      {!loggedIn ? (<>
        <Link to="/login">Login</Link>
        <Link to="/register">Register</Link>
      </>) : (
        <button onClick={logout}>Logout</button>
      )}
    </nav>
  );
}

function AppShell() {
  return (
    <>
      <Nav/>
      <Routes>
        <Route path="/" element={<Catalog/>} />
        <Route path="/product/:id" element={<Product/>} />
        <Route path="/login" element={<Login/>} />
        <Route path="/register" element={<Register/>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

createRoot(document.getElementById("root")).render(
  <BrowserRouter><AppShell/></BrowserRouter>
);
