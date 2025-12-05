import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchPendingComments, updateCommentStatus } from "../api/reviews";
import { fetchProductById } from "../api/products";
import "./CommentModeration.css";

export default function CommentModeration() {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(new Set());

  useEffect(() => {
    loadComments();
  }, []);

  async function loadComments() {
    setLoading(true);
    setError("");
    try {
      const pending = await fetchPendingComments();
      // Enrich with product names
      const enriched = await Promise.all(
        pending.map(async (comment) => {
          try {
            const product = await fetchProductById(comment.product_id || comment.product);
            return {
              ...comment,
              product_name: product?.name || `Product #${comment.product_id || comment.product}`,
            };
          } catch {
            return {
              ...comment,
              product_name: `Product #${comment.product_id || comment.product}`,
            };
          }
        })
      );
      setComments(enriched);
    } catch (err) {
      setError(err.message || "Failed to load pending comments");
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusUpdate(commentId, newStatus) {
    setProcessing((prev) => new Set(prev).add(commentId));
    try {
      await updateCommentStatus(commentId, newStatus);
      // Remove from list or update status
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      setError(err.message || "Failed to update comment");
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
    }
  }

  if (loading) {
    return (
      <div className="moderation-page">
        <div className="moderation-card">
          <p>Loading pending comments…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="moderation-page">
      <header className="moderation-header">
        <div>
          <p className="breadcrumbs">
            <Link to="/products">Products</Link> / <span>Comment Moderation</span>
          </p>
          <h1>Comment Moderation</h1>
          <p className="muted">
            Review and approve or reject pending comments. {comments.length} pending comment{comments.length !== 1 ? "s" : ""}.
          </p>
        </div>
        <button onClick={loadComments} className="refresh-btn" disabled={loading}>
          Refresh
        </button>
      </header>

      {error && <div className="alert error">{error}</div>}

      {comments.length === 0 ? (
        <div className="moderation-card">
          <p className="muted">No pending comments at this time.</p>
        </div>
      ) : (
        <section className="moderation-card">
          <ul className="comment-moderation-list">
            {comments.map((comment) => (
              <li key={comment.id} className="moderation-item">
                <div className="moderation-item-header">
                  <div>
                    <Link
                      to={`/product/${comment.product_id || comment.product}`}
                      className="product-link"
                    >
                      {comment.product_name}
                    </Link>
                    <span className="comment-author">by {comment.author || "Anonymous"}</span>
                  </div>
                  <span className="comment-date">
                    {new Date(comment.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="comment-body">{comment.body}</div>
                <div className="moderation-actions">
                  <button
                    type="button"
                    className="btn-approve"
                    onClick={() => handleStatusUpdate(comment.id, "approved")}
                    disabled={processing.has(comment.id)}
                  >
                    {processing.has(comment.id) ? "Processing…" : "Approve"}
                  </button>
                  <button
                    type="button"
                    className="btn-reject"
                    onClick={() => handleStatusUpdate(comment.id, "rejected")}
                    disabled={processing.has(comment.id)}
                  >
                    {processing.has(comment.id) ? "Processing…" : "Reject"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

