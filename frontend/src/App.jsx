import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "./App.css";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { isAdmin } from "./utils/admin";
import { getGuestCartCount } from "./stores/cart";

// Pages
import ProductList from "./pages/ProductList.jsx";
import Product from "./pages/Product.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Checkout from "./pages/Checkout.jsx";
import Orders from "./pages/Orders.jsx";
import Profile from "./pages/Profile.jsx";
import CommentModeration from "./pages/CommentModeration.jsx";
import AdminOrders from "./pages/AdminOrders.jsx";

function Navigation() {
  const { isAuthenticated, logout, user } = useAuth();
  const [cartCount, setCartCount] = useState(0);

  // Update cart count periodically
  useEffect(() => {
    const updateCartCount = () => {
      setCartCount(getGuestCartCount());
    };
    updateCartCount();
    const interval = setInterval(updateCartCount, 500);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  // Shopping cart icon SVG
  const CartIcon = () => (
    <svg 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      style={{ marginRight: "8px" }}
    >
      <circle cx="9" cy="21" r="1"></circle>
      <circle cx="20" cy="21" r="1"></circle>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
    </svg>
  );

  return (
    <nav style={{
      padding: "16px 24px",
      borderBottom: "2px solid #4DA6FF",
      display: "flex",
      gap: 16,
      justifyContent: "space-between",
      alignItems: "center",
      background: "linear-gradient(135deg, #0066FF 0%, #0052CC 100%)",
      boxShadow: "0 4px 12px rgba(0, 102, 255, 0.3)"
    }}>
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <Link to="/products" style={{ 
          color: "#fff", 
          fontWeight: 700, 
          fontSize: "1.1rem",
          textDecoration: "none",
          transition: "all 0.2s ease",
          padding: "4px 8px",
          borderRadius: "6px"
        }}
        onMouseEnter={(e) => e.target.style.background = "rgba(255, 255, 255, 0.2)"}
        onMouseLeave={(e) => e.target.style.background = "transparent"}
        >Home</Link>
        <Link to="/products" style={{ 
          color: "#fff", 
          fontWeight: 600,
          textDecoration: "none",
          transition: "all 0.2s ease",
          padding: "4px 8px",
          borderRadius: "6px"
        }}
        onMouseEnter={(e) => e.target.style.background = "rgba(255, 255, 255, 0.2)"}
        onMouseLeave={(e) => e.target.style.background = "transparent"}
        >Products</Link>
        {isAuthenticated && <Link to="/orders" style={{ 
          color: "#fff", 
          fontWeight: 600,
          textDecoration: "none",
          transition: "all 0.2s ease",
          padding: "4px 8px",
          borderRadius: "6px"
        }}
        onMouseEnter={(e) => e.target.style.background = "rgba(255, 255, 255, 0.2)"}
        onMouseLeave={(e) => e.target.style.background = "transparent"}
        >My Orders</Link>}
        {isAdmin(user) && <Link to="/admin/comments" style={{ 
          color: "#fff", 
          fontWeight: 600,
          textDecoration: "none",
          transition: "all 0.2s ease",
          padding: "4px 8px",
          borderRadius: "6px"
        }}
        onMouseEnter={(e) => e.target.style.background = "rgba(255, 255, 255, 0.2)"}
        onMouseLeave={(e) => e.target.style.background = "transparent"}
        >Moderate Comments</Link>}
        {isAdmin(user) && <Link to="/admin/orders" style={{ 
          color: "#fff", 
          fontWeight: 600,
          textDecoration: "none",
          transition: "all 0.2s ease",
          padding: "4px 8px",
          borderRadius: "6px"
        }}
        onMouseEnter={(e) => e.target.style.background = "rgba(255, 255, 255, 0.2)"}
        onMouseLeave={(e) => e.target.style.background = "transparent"}
        >Manage Orders</Link>}
      </div>
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        {/* Shopping Cart Button */}
        <Link 
          to="/checkout" 
          style={{ 
            display: "flex",
            alignItems: "center",
            background: "linear-gradient(135deg, #FFB800 0%, #FF9500 100%)",
            color: "#003D99",
            fontWeight: 700,
            fontSize: "1rem",
            textDecoration: "none",
            padding: "10px 20px",
            borderRadius: "12px",
            border: "2px solid #FFD700",
            boxShadow: "0 4px 12px rgba(255, 184, 0, 0.4), 0 0 0 2px rgba(255, 255, 255, 0.2)",
            transition: "all 0.3s ease",
            position: "relative"
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = "translateY(-2px) scale(1.05)";
            e.target.style.boxShadow = "0 6px 20px rgba(255, 184, 0, 0.6), 0 0 0 3px rgba(255, 255, 255, 0.3)";
            e.target.style.background = "linear-gradient(135deg, #FFD700 0%, #FFB800 100%)";
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = "translateY(0) scale(1)";
            e.target.style.boxShadow = "0 4px 12px rgba(255, 184, 0, 0.4), 0 0 0 2px rgba(255, 255, 255, 0.2)";
            e.target.style.background = "linear-gradient(135deg, #FFB800 0%, #FF9500 100%)";
          }}
        >
          <CartIcon />
          <span>Checkout</span>
          {cartCount > 0 && (
            <span style={{
              position: "absolute",
              top: "-8px",
              right: "-8px",
              background: "linear-gradient(135deg, #FF0066 0%, #CC0052 100%)",
              color: "#fff",
              borderRadius: "50%",
              width: "24px",
              height: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              fontWeight: 700,
              border: "2px solid #fff",
              boxShadow: "0 2px 8px rgba(255, 0, 102, 0.5)",
              animation: "pulse 2s infinite"
            }}>
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
        </Link>
        {isAuthenticated ? (
          <>
            <Link to="/profile" style={{ 
              color: "#fff", 
              fontWeight: 600,
              textDecoration: "none",
              transition: "all 0.2s ease",
              padding: "4px 8px",
              borderRadius: "6px"
            }}
            onMouseEnter={(e) => e.target.style.background = "rgba(255, 255, 255, 0.2)"}
            onMouseLeave={(e) => e.target.style.background = "transparent"}
            >Profile</Link>
            <button onClick={handleLogout} style={{ 
              cursor: "pointer",
              background: "#fff",
              color: "#0066FF",
              border: "2px solid #fff",
              borderRadius: "8px",
              padding: "8px 16px",
              fontWeight: 600,
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "#E6F2FF";
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "#fff";
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "none";
            }}
            >Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" style={{ 
              color: "#fff", 
              fontWeight: 600,
              textDecoration: "none",
              transition: "all 0.2s ease",
              padding: "4px 8px",
              borderRadius: "6px"
            }}
            onMouseEnter={(e) => e.target.style.background = "rgba(255, 255, 255, 0.2)"}
            onMouseLeave={(e) => e.target.style.background = "transparent"}
            >Login</Link>
            <Link to="/register" style={{ 
              color: "#fff", 
              fontWeight: 600,
              textDecoration: "none",
              background: "rgba(255, 255, 255, 0.2)",
              padding: "8px 16px",
              borderRadius: "8px",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "rgba(255, 255, 255, 0.3)";
              e.target.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "rgba(255, 255, 255, 0.2)";
              e.target.style.transform = "translateY(0)";
            }}
            >Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navigation />

        <Routes>
          <Route path="/" element={<Navigate to="/products" replace />} />
          <Route path="/products" element={<ProductList />} />
          <Route path="/product/:id" element={<Product />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin/comments" element={<CommentModeration />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="*" element={<div style={{ padding: 24 }}>404</div>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
