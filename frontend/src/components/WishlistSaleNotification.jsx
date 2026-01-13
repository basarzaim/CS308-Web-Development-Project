import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import "./WishlistSaleNotification.css";

export default function WishlistSaleNotification() {
  const { isAuthenticated } = useAuth();
  const [saleItems, setSaleItems] = useState([]);
  const [showNotification, setShowNotification] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || dismissed) return;

    checkWishlistSales();
  }, [isAuthenticated, dismissed]);

  async function checkWishlistSales() {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      // Fetch wishlist
      const response = await fetch("http://localhost:8000/api/wishlist/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) return;

      const wishlistData = await response.json();
      const items = wishlistData.results || wishlistData;

      // Filter items that are on sale
      const onSaleItems = items.filter((item) => item.product?.is_on_sale);

      if (onSaleItems.length > 0) {
        setSaleItems(onSaleItems);
        setShowNotification(true);
      }
    } catch (error) {
      console.error("Error checking wishlist sales:", error);
    }
  }

  function handleDismiss() {
    setShowNotification(false);
    setDismissed(true);
    // Store in sessionStorage so it doesn't show again this session
    sessionStorage.setItem("wishlist_sale_notification_dismissed", "true");
  }

  function handleViewWishlist() {
    window.location.href = "/wishlist";
  }

  if (!showNotification || saleItems.length === 0) {
    return null;
  }

  const totalSavings = saleItems.reduce((sum, item) => {
    return sum + (item.product?.savings || 0);
  }, 0);

  return (
    <div className="wishlist-sale-overlay">
      <div className="wishlist-sale-popup">
        <button className="close-btn" onClick={handleDismiss}>
          ×
        </button>

        <div className="popup-header">
          <div className="popup-icon">🎉</div>
          <h2>Sale Alert!</h2>
          <p className="popup-subtitle">
            {saleItems.length} {saleItems.length === 1 ? "item" : "items"} from
            your wishlist {saleItems.length === 1 ? "is" : "are"} now on sale!
          </p>
        </div>

        <div className="sale-items-list">
          {saleItems.slice(0, 3).map((item) => (
            <div key={item.id} className="sale-item-card">
              <img
                src={item.product?.image || item.product?.image_url}
                alt={item.product?.name}
                className="sale-item-image"
              />
              <div className="sale-item-details">
                <h3 className="sale-item-name">{item.product?.name}</h3>
                <div className="sale-item-prices">
                  <span className="original-price">
                    ${item.product?.price}
                  </span>
                  <span className="sale-price">
                    ${item.product?.discounted_price?.toFixed(2)}
                  </span>
                  <span className="discount-badge">
                    {item.product?.discount_percentage}% OFF
                  </span>
                </div>
                <p className="savings-text">
                  Save ${item.product?.savings?.toFixed(2)}
                </p>
              </div>
            </div>
          ))}

          {saleItems.length > 3 && (
            <p className="more-items-text">
              +{saleItems.length - 3} more{" "}
              {saleItems.length - 3 === 1 ? "item" : "items"} on sale
            </p>
          )}
        </div>

        <div className="popup-footer">
          <div className="total-savings">
            <span className="savings-label">Total Potential Savings:</span>
            <span className="savings-amount">${totalSavings.toFixed(2)}</span>
          </div>

          <div className="popup-actions">
            <button className="btn-secondary" onClick={handleDismiss}>
              Maybe Later
            </button>
            <button className="btn-primary" onClick={handleViewWishlist}>
              View Wishlist
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
