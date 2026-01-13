// src/components/EmptyState.jsx
import { Link } from "react-router-dom";
import "./EmptyState.css";

export default function EmptyState({
  icon = "📦",
  title = "Nothing here yet",
  description = "",
  actionText = "",
  actionLink = "",
  onAction = null,
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-description">{description}</p>}
      {actionText && (
        <div className="empty-state-action">
          {actionLink ? (
            <Link to={actionLink} className="empty-state-btn">
              {actionText}
            </Link>
          ) : onAction ? (
            <button onClick={onAction} className="empty-state-btn">
              {actionText}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
