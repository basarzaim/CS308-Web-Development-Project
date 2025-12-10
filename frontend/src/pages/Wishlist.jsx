import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchProductById } from "../api/products";
import { getGuestWishlist, removeFromGuestWishlist } from "../stores/wishlist";
import { addToGuestCart } from "../stores/cart";
import "./Wishlist.css";

export default function Wishlist() {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWishlist() {
      const productIds = getGuestWishlist();
      if (productIds.length === 0) {
        setWishlistItems([]);
        setLoading(false);
        return;
      }

      try {
        const products = await Promise.all(
          productIds.map(id => fetchProductById(id).catch(() => null))
        );
        setWishlistItems(products.filter(p => p !== null));
      } catch (err) {
        console.error("Failed to load wishlist:", err);
        setWishlistItems([]);
      } finally {
        setLoading(false);
      }
    }
    loadWishlist();
  }, []);

  function handleRemove(productId) {
    removeFromGuestWishlist(productId);
    setWishlistItems(prev => prev.filter(p => p.id !== productId));
  }

  function handleAddToCart(productId) {
    addToGuestCart(productId, 1);
    // Optionally remove from wishlist after adding to cart
    // handleRemove(productId);
  }

  const HeartIcon = ({ filled = false, onClick }) => (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick?.();
      }}
      className="wishlist-heart-btn"
      aria-label={filled ? "Remove from wishlist" : "Add to wishlist"}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill={filled ? "#FF0066" : "none"}
        stroke="#FF0066"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="wishlist-heart-icon"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
      </svg>
    </button>
  );

  if (loading) {
    return (
      <div className="wishlist-page">
        <div className="wishlist-container">
          <h1>My Wishlist</h1>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wishlist-page">
      <div className="wishlist-container">
        <header className="wishlist-header">
          <h1>My Wishlist</h1>
          {wishlistItems.length > 0 && (
            <p className="wishlist-count">{wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'}</p>
          )}
        </header>

        {wishlistItems.length === 0 ? (
          <div className="wishlist-empty">
            <div className="wishlist-empty-icon">♡</div>
            <h2>Your wishlist is empty</h2>
            <p>Start adding products you love to your wishlist!</p>
            <Link to="/products" className="wishlist-empty-btn">
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="wishlist-grid">
            {wishlistItems.map((product) => (
              <div key={product.id} className="wishlist-card">
                <Link to={`/product/${product.id}`} className="wishlist-card-link">
                  <img
                    src={product.image || product.image_url}
                    alt={product.name}
                    className="wishlist-card-image"
                  />
                  <div className="wishlist-card-content">
                    <h3 className="wishlist-card-name">{product.name}</h3>
                    <div className="wishlist-card-meta">
                      <span className="wishlist-card-price">
                        ${Number(product.price).toFixed(2)}
                      </span>
                      {product.rating != null && (
                        <span className="wishlist-card-rating">⭐ {product.rating}</span>
                      )}
                    </div>
                  </div>
                </Link>
                <div className="wishlist-card-actions">
                  <HeartIcon
                    filled={true}
                    onClick={() => handleRemove(product.id)}
                  />
                  <button
                    className="wishlist-add-cart-btn"
                    onClick={() => handleAddToCart(product.id)}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

