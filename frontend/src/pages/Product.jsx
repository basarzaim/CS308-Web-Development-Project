import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchProductById } from "../api/products";
import {
  fetchProductComments,
  createProductComment,
  submitProductRating,
  fetchRatingSummary,
} from "../api/reviews";
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

  const productId = useMemo(() => Number(id), [id]);
  const isLoggedIn = Boolean(localStorage.getItem("access_token"));

  useEffect(() => {
    let active = true;
    setLoadingProduct(true);
    setProductError("");
    fetchProductById(productId)
      .then((data) => {
        if (active) setProduct(data);
      })
      .catch((err) => {
        if (active) setProductError(err.message || "Ürün yüklenemedi");
      })
      .finally(() => {
        if (active) setLoadingProduct(false);
      });
    return () => {
      active = false;
    };
  }, [productId]);

  useEffect(() => {
    loadComments();
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function loadComments() {
    setCommentsError("");
    setCommentsLoading(true);
    try {
      const list = await fetchProductComments(productId);
      setComments(Array.isArray(list) ? list : []);
    } catch (err) {
      setCommentsError(err.message || "Yorumlar getirilemedi");
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
      setCommentsError("Lütfen yorum metnini doldurun.");
      return;
    }
    try {
      await createProductComment(productId, trimmed);
      setCommentBody("");
      setCommentNotice("Yorumun alındı! Onaylandıktan sonra listede görünecek.");
    } catch (err) {
      setCommentsError(err.message || "Yorum gönderilemedi.");
    }
  }

  async function handleRatingSubmit() {
    setRatingNotice("");
    setRatingError("");
    if (!isLoggedIn) {
      setRatingError("Puanlamak için giriş yapmalısınız.");
      return;
    }
    if (!ratingValue) {
      setRatingError("Lütfen 1-5 arası bir puan seçin.");
      return;
    }
    setRatingLoading(true);
    try {
      await submitProductRating(productId, ratingValue);
      setRatingNotice("Teşekkürler! Bu ürünü başarıyla oyladınız.");
      await loadSummary();
    } catch (err) {
      setRatingError(err.message || "Puan gönderilemedi.");
    } finally {
      setRatingLoading(false);
    }
  }

  if (loadingProduct) {
    return (
      <div className="product-page">
        <section className="product-card">
          <p>Ürün bilgileri yükleniyor…</p>
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
            Ürün listesine dön
          </Link>
        </section>
      </div>
    );
  }

  if (!product) return null;

  const formattedPrice = `${Number(product.price ?? 0).toFixed(2)} ${product.currency || "TRY"}`;
  const stockLabel =
    product.stock > 0
      ? `${product.stock} adet stokta`
      : "Stokta yok";

  return (
    <div className="product-page">
      <section className="product-card">
        <p className="breadcrumbs">
          <Link to="/products">Products</Link> / <span>{product.name}</span>
        </p>
        <h1 className="product-title">{product.name}</h1>
        <p className="product-description">
          {product.description || "Bu ürün için açıklama eklenmedi."}
        </p>
        <div className="product-meta-row">
          <span className="product-price">{formattedPrice}</span>
          <span className="product-meta">{stockLabel}</span>
          <span className="product-meta">
            Garanti: {product.warranty != null ? `${product.warranty} ay` : "Belirtilmedi"}
          </span>
        </div>
      </section>

      <section className="product-card">
        <div className="section-header">
          <h2>Puanlama</h2>
          {ratingSummary?.count ? (
            <div className="rating-summary">
              <span className="rating-value">{ratingSummary.average.toFixed(1)}</span>
              <span className="rating-count">({ratingSummary.count} oy)</span>
            </div>
          ) : (
            <span className="muted">Bu ürün için henüz puan yok.</span>
          )}
        </div>

        <div className="rating-control">
          <div className="rating-stars" role="group" aria-label="Ürün puanı">
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
            {ratingLoading ? "Gönderiliyor…" : "Puanı Gönder"}
          </button>
        </div>
        {!isLoggedIn && (
          <p className="muted">
            Puanlamak için <Link to="/login">giriş yapın</Link>.
          </p>
        )}
        {ratingNotice && <p className="success">{ratingNotice}</p>}
        {ratingError && <p className="error">{ratingError}</p>}
      </section>

      <section className="product-card">
        <div className="section-header">
          <h2>Yorumlar</h2>
          <span className="badge">{comments.length}</span>
        </div>
        {commentsLoading ? (
          <p>Yorumlar yükleniyor…</p>
        ) : commentsError ? (
          <p className="error">{commentsError}</p>
        ) : comments.length ? (
          <ul className="comment-list">
            {comments.map((comment) => (
              <li key={comment.id} className="comment-item">
                <div className="comment-meta">
                  <span>{comment.author || "Anonim"}</span>
                  <span>{new Date(comment.created_at).toLocaleString()}</span>
                </div>
                <p>{comment.body}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Henüz yorum yapılmamış.</p>
        )}

        <div className="comment-form">
          <h3>Yorum ekle</h3>
          {!isLoggedIn ? (
            <p className="muted">
              Yorum yazmak için <Link to="/login">giriş yapın</Link> veya yeni bir{" "}
              <Link to="/register">hesap oluşturun</Link>.
            </p>
          ) : (
            <form onSubmit={handleCommentSubmit}>
              <textarea
                rows={4}
                placeholder="Bu ürün hakkında düşüncelerini paylaş..."
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
              />
              <button type="submit" className="primary-btn">
                Gönder
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
