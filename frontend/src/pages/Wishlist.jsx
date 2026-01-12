import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchProductById } from "../api/products";
import { getWishlist, removeFromWishlist } from "../stores/wishlist";
import { addToCart } from "../stores/cart";
import { useAuth } from "../context/AuthContext";
import * as wishlistAPI from "../api/wishlist";
import "./Wishlist.css";

export default function Wishlist() {
  const { isAuthenticated } = useAuth();
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDiscountNotification, setShowDiscountNotification] = useState(false);
  const [discountedItems, setDiscountedItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadWishlist() {
      setLoading(true);
      setError("");
      try {
        if (isAuthenticated) {
          // Fetch from backend API - it returns full product details
          const wishlistData = await wishlistAPI.fetchWishlist();
          console.log("Wishlist data from API:", wishlistData);
          
          // Map wishlist items to product format for display
          const products = wishlistData.map((item) => {
            const productId = item.product_id ?? item.product?.id ?? item.product;
            const hasDiscount = item.has_discount === true || item.has_discount === "true";
            const product = {
              id: productId,
              name: item.product_name,
              price: Number(item.product_price),
              image: item.product_image,
              image_url: item.product_image, // Alias for compatibility
              rating: item.product_rating,
              has_discount: hasDiscount,
              discount_amount: item.discount_amount ? Number(item.discount_amount) : null,
              discount_percentage: item.discount_percentage ? Number(item.discount_percentage) : null,
              original_price: item.original_price ? Number(item.original_price) : (item.price_when_added ? Number(item.price_when_added) : null),
            };
            if (hasDiscount) {
              console.log("Discounted product found:", product);
            }
            return product;
          });
          setWishlistItems(products);
          
          // Check for discounted items and show notification
          const discounted = products.filter(p => p.has_discount === true);
          console.log("Total discounted items:", discounted.length, discounted);
          if (discounted.length > 0) {
            setDiscountedItems(discounted);
            // Show notification after a brief delay to ensure page is loaded
            setTimeout(() => {
              setShowDiscountNotification(true);
            }, 500);
          }
        } else {
          // Guest wishlist - fetch products in parallel
          const productIds = await getWishlist();
          if (productIds.length === 0) {
            setWishlistItems([]);
            setLoading(false);
            return;
          }
          const products = await Promise.all(
            productIds.map(id => fetchProductById(id).catch(() => null))
          );
          setWishlistItems(products.filter(p => p !== null));
        }
      } catch (err) {
        console.error("Failed to load wishlist:", err);
        setError(err.message || "Failed to load wishlist");
        setWishlistItems([]);
      } finally {
        setLoading(false);
      }
    }
    loadWishlist();
  }, [isAuthenticated]);

  async function handleRemove(productId) {
    try {
      await removeFromWishlist(productId);
      setWishlistItems(prev => prev.filter(p => p.id !== productId));
      setDiscountedItems(prev => prev.filter(p => p.id !== productId));
    } catch (err) {
      console.error("Failed to remove from wishlist:", err);
      setError(err.message || "Failed to remove item");
    }
  }

  async function handleAddToCart(productId) {
    try {
      await addToCart(productId, 1);
      // Optionally remove from wishlist after adding to cart
      // handleRemove(productId);
    } catch (err) {
      console.error("Failed to add to cart:", err);
    }
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
          <div className="wishlist-header-top">
            <div>
              <h1>My Wishlist</h1>
              {wishlistItems.length > 0 && (
                <p className="wishlist-count">{wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'}</p>
              )}
            </div>
          </div>
          
          {/* Search Bar */}
          {wishlistItems.length > 0 && (
            <div className="wishlist-search-container">
              <input
                type="text"
                placeholder="Search your wishlist..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="wishlist-search-input"
              />
              {searchQuery && (
                <button
                  className="wishlist-search-clear"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>
          )}
        </header>

        {error && <div className="alert error">{error}</div>}

        {/* Discount Notification Popup */}
        {showDiscountNotification && discountedItems.length > 0 && (
          <div className="wishlist-discount-notification">
            <div className="wishlist-discount-notification-content">
              <div className="wishlist-discount-notification-header">
                <h2>🎉 Price Drop Alert!</h2>
                <button 
                  className="wishlist-discount-close"
                  onClick={() => setShowDiscountNotification(false)}
                  aria-label="Close notification"
                >
                  ×
                </button>
              </div>
              <p className="wishlist-discount-message">
                {discountedItems.length === 1 
                  ? `Great news! "${discountedItems[0].name}" is now on sale!`
                  : `Great news! ${discountedItems.length} items in your wishlist are now on sale!`
                }
              </p>
              <div className="wishlist-discount-items">
                {discountedItems.map((item) => (
                  <div key={item.id} className="wishlist-discount-item">
                    <span className="wishlist-discount-item-name">{item.name}</span>
                    <div className="wishlist-discount-item-prices">
                      <span className="wishlist-discount-original-price">
                        ${Number(item.original_price).toFixed(2)}
                      </span>
                      <span className="wishlist-discount-arrow">→</span>
                      <span className="wishlist-discount-new-price">
                        ${Number(item.price).toFixed(2)}
                      </span>
                      {item.discount_percentage && (
                        <span className="wishlist-discount-badge">
                          -{item.discount_percentage}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button
                className="wishlist-discount-dismiss"
                onClick={() => setShowDiscountNotification(false)}
              >
                Got it!
              </button>
            </div>
          </div>
        )}

        {wishlistItems.length === 0 ? (
          <div className="wishlist-empty">
            <div className="wishlist-empty-icon">♡</div>
            <h2>Your wishlist is empty</h2>
            <p>Start adding products you love to your wishlist!</p>
            <Link to="/products" className="wishlist-empty-btn">
              Browse Products
            </Link>
          </div>
        ) : (() => {
          // Filter items based on search query
          const filteredItems = wishlistItems.filter((product) => {
            if (!searchQuery.trim()) return true;
            const query = searchQuery.toLowerCase();
            return (
              product.name?.toLowerCase().includes(query) ||
              product.id?.toString().includes(query)
            );
          });

          return filteredItems.length === 0 ? (
            <div className="wishlist-empty">
              <div className="wishlist-empty-icon">🔍</div>
              <h2>No items found</h2>
              <p>No products match your search "{searchQuery}"</p>
              <button
                className="wishlist-empty-btn"
                onClick={() => setSearchQuery("")}
                style={{ cursor: 'pointer', border: 'none' }}
              >
                Clear Search
              </button>
            </div>
          ) : (
            <>
              {searchQuery && (
                <div className="wishlist-search-results">
                  Showing {filteredItems.length} of {wishlistItems.length} items
                </div>
              )}
              <div className="wishlist-grid">
                {filteredItems.map((product) => {
              const isDiscounted = product.has_discount === true;
              return (
              <div key={product.id} className={`wishlist-card ${isDiscounted ? 'wishlist-card-discounted' : ''}`}>
                {isDiscounted && (
                  <div className="wishlist-card-sale-banner">🔥 ON SALE!</div>
                )}
                <Link to={`/product/${product.id}`} className="wishlist-card-link">
                  <img
                    src={product.image || product.image_url}
                    alt={product.name}
                    className="wishlist-card-image"
                  />
                  <div className="wishlist-card-content">
                    <h3 className="wishlist-card-name">{product.name}</h3>
                    <div className="wishlist-card-meta">
                      <div className="wishlist-card-price-container">
                        {isDiscounted && product.original_price ? (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span className="wishlist-card-original-price">
                                ${Number(product.original_price).toFixed(2)}
                              </span>
                              <span className="wishlist-card-price wishlist-card-price-discounted">
                                ${Number(product.price).toFixed(2)}
                              </span>
                              {product.discount_percentage && (
                                <span className="wishlist-card-discount-badge">
                                  -{product.discount_percentage}% OFF
                                </span>
                              )}
                            </div>
                            {product.discount_amount && (
                              <div className="wishlist-card-savings">
                                You save ${Number(product.discount_amount).toFixed(2)}!
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="wishlist-card-price">
                            ${Number(product.price).toFixed(2)}
                          </span>
                        )}
                      </div>
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
              );
            })}
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
