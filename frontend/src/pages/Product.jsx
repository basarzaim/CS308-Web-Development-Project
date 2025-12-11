import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  fetchProductComments,
  createProductComment,
  submitProductRating,
  fetchRatingSummary,
} from "../api/reviews";
import { getProductDetail } from '../services/products';
import { addToCart } from "../stores/cart";
import "./Product.css";

const STAR_VALUES = [1, 2, 3, 4, 5];

export default function Product() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [productError, setProductError] = useState("");

  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsError, setCommentsError] = useState("");

  const [commentBody, setCommentBody] = useState("");
  const [commentNotice, setCommentNotice] = useState("");

  const [ratingSummary, setRatingSummary] = useState(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingNotice, setRatingNotice] = useState("");
  const [ratingError, setRatingError] = useState("");
  const [cartNotice, setCartNotice] = useState("");

  const productId = useMemo(() => Number(id), [id]);
  const isLoggedIn = Boolean(localStorage.getItem("access_token"));

  useEffect(() => {
    let active = true;
    setLoadingProduct(true);
    setProductError("");
    getProductDetail(productId)
      .then((data) => {
        if (active) setProduct(data);
      })
      .catch((err) => {
        if (active) setProductError(err.message || "Failed to load product");
      })
      .finally(() => {
        if (active) setLoadingProduct(false);
      });
    return () => {
      active = false;
    };
  }, [productId]);

  useEffect(() => {
    // Load comments and rating summary in parallel for better performance
    Promise.all([
      loadComments(),
      loadSummary()
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function loadComments() {
    setCommentsError("");
    setCommentsLoading(true);
    try {
      const list = await fetchProductComments(productId);
      setComments(Array.isArray(list) ? list : []);
    } catch (err) {
      setCommentsError(err.message || "Failed to load comments.");
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  }

  async function loadSummary() {
    try {
      const summary = await fetchRatingSummary(productId);
      setRatingSummary(summary);
    } catch {
      setRatingSummary(null);
    }
  }

  async function handleCommentSubmit(e) {
    e.preventDefault();
    setCommentNotice("");
    setCommentsError("");
    const trimmed = commentBody.trim();
    if (!trimmed) {
      setCommentsError("Please enter a comment.");
      return;
    }
    try {
      await createProductComment(productId, trimmed);
      setCommentBody("");
      setCommentNotice("Thanks! Your comment will appear once approved.");
    } catch (err) {
      setCommentsError(err.message || "Failed to submit comment.");
    }
  }

  async function handleRatingSubmit() {
    setRatingNotice("");
    setRatingError("");
    if (!isLoggedIn) {
      setRatingError("You need to log in to rate this product.");
      return;
    }
    if (!ratingValue) {
      setRatingError("Please choose a rating between 1 and 5.");
      return;
    }
    setRatingLoading(true);
    try {
      await submitProductRating(productId, ratingValue);
      setRatingNotice("Thanks! Your rating has been submitted.");
      await loadSummary();
    } catch (err) {
      setRatingError(err.message || "Failed to submit rating.");
    } finally {
      setRatingLoading(false);
    }
  }

  async function handleAddToCart() {
    try {
      await addToCart(productId, 1);
      setCartNotice("Product added to cart!");
      setTimeout(() => setCartNotice(""), 4000);
    } catch (err) {
      setCartNotice("Failed to add to cart");
      setTimeout(() => setCartNotice(""), 4000);
    }
  }

  if (loadingProduct) {
    return (
      <div className="product-page">
        <section className="product-card">
          <p>Loading product details…</p>
        </section>
      </div>
    );
  }

  if (productError) {
    return (
      <div className="product-page">
        <section className="product-card">
          <p className="error">{productError}</p>
          <Link to="/products" className="link">
            Back to products
          </Link>
        </section>
      </div>
    );
  }

  if (!product) return null;

  const formattedPrice = `$${Number(product.price ?? 0).toFixed(2)}`;
  const stockLabel =
    product.stock > 0
      ? `${product.stock} in stock`
      : "Out of stock";

  return (
    <div className="product-page">
      <section className="product-card">
        <p className="breadcrumbs">
          <Link to="/products">Products</Link> / <span>{product.name}</span>
        </p>
        <h1 className="product-title">{product.name}</h1>
        <p className="product-description">
          {product.description || "No description provided for this product."}
        </p>
        <div className="product-meta-row">
          <span className="product-price">{formattedPrice}</span>
          <span className="product-meta">{stockLabel}</span>
          <span className="product-meta">
            Warranty: {product.warranty != null ? `${product.warranty} months` : "Not specified"}
          </span>
        </div>
        <div className="product-actions">
          <button type="button" className="primary-btn" onClick={handleAddToCart}>
            Add to cart
          </button>
          {cartNotice && (
            <p className="success" style={{ margin: 0 }}>
              {cartNotice} <Link to="/checkout">Go to checkout</Link>
            </p>
          )}
        </div>
      </section>

      <section className="product-card">
        <div className="section-header">
          <h2>Ratings</h2>
          {ratingSummary?.count ? (
            <div className="rating-summary">
              <span className="rating-value">{ratingSummary.average.toFixed(1)}</span>
              <span className="rating-count">({ratingSummary.count} ratings)</span>
            </div>
          ) : (
            <span className="muted">No ratings yet for this product.</span>
          )}
        </div>

        <div className="rating-control">
          <div className="rating-stars" role="group" aria-label="Product rating">
            {STAR_VALUES.map((value) => (
              <button
                type="button"
                key={value}
                className={`rating-star ${value <= ratingValue ? "active" : ""}`}
                onClick={() => setRatingValue(value)}
                disabled={ratingLoading}
              >
                ★
              </button>
            ))}
          </div>
          <button
            type="button"
            className="primary-btn"
            onClick={handleRatingSubmit}
            disabled={ratingLoading}
          >
            {ratingLoading ? "Submitting…" : "Submit rating"}
          </button>
        </div>
        {!isLoggedIn && (
          <p className="muted">
            <Link to="/login">Log in</Link> to rate this product.
          </p>
        )}
        {ratingNotice && <p className="success">{ratingNotice}</p>}
        {ratingError && <p className="error">{ratingError}</p>}
      </section>

      <section className="product-card">
        <div className="section-header">
          <h2>Comments</h2>
          <span className="badge">{comments.length}</span>
        </div>
        {commentsLoading ? (
          <p>Loading comments…</p>
        ) : commentsError ? (
          <p className="error">{commentsError}</p>
        ) : comments.length ? (
          <ul className="comment-list">
            {comments.map((comment) => (
              <li key={comment.id} className="comment-item">
                <div className="comment-meta">
                  <span>{comment.author || "Anonymous"}</span>
                  <span>{new Date(comment.created_at).toLocaleString()}</span>
                </div>
                <p>{comment.body}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No comments yet.</p>
        )}

        <div className="comment-form">
          <h3>Add a comment</h3>
          {!isLoggedIn ? (
            <p className="muted">
              Log in to write a comment or <Link to="/register">create an account</Link>.
            </p>
          ) : (
            <form onSubmit={handleCommentSubmit}>
              <textarea
                rows={4}
                placeholder="Share your thoughts about this product..."
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
              />
              <button type="submit" className="primary-btn">
                Submit
              </button>
            </form>
          )}
          {commentNotice && <p className="success">{commentNotice}</p>}
          {commentsError && isLoggedIn && <p className="error">{commentsError}</p>}
        </div>
      </section>
    </div>
  );
}
