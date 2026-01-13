import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { isSupportAgent } from "../utils/admin";
import {
  fetchConversationQueue,
  fetchConversation,
  claimConversation,
  resolveConversation,
  sendMessage,
  fetchMessages,
  fetchCustomerDetails,
  markMessageRead,
} from "../api/support";
import { Navigate } from "react-router-dom";
import "./SupportDashboard.css";

export default function SupportDashboard() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [queue, setQueue] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [customerDetails, setCustomerDetails] = useState(null);
  const [inputMessage, setInputMessage] = useState("");
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const pollingIntervalRef = useRef(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated && isSupportAgent(user)) {
      loadQueue();
    }
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [isAuthenticated, authLoading, user]);

  // Poll for new messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      loadMessages();
      loadCustomerDetails();
      
      // Poll every 3 seconds for new messages
      const interval = setInterval(() => {
        loadMessages();
      }, 3000);
      
      pollingIntervalRef.current = interval;
      
      return () => {
        clearInterval(interval);
      };
    }
  }, [selectedConversation]);

  const loadQueue = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchConversationQueue();
      setQueue(data);
    } catch (err) {
      setError(err.message || "Failed to load conversation queue");
    } finally {
      setLoading(false);
    }
  };

  const loadConversation = async (conversationId) => {
    setLoading(true);
    setError("");
    try {
      const conv = await fetchConversation(conversationId);
      setSelectedConversation(conv);
      await loadMessages();
      await loadCustomerDetails();
    } catch (err) {
      setError(err.message || "Failed to load conversation");
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!selectedConversation) return;
    
    try {
      const msgs = await fetchMessages(selectedConversation.id);
      setMessages(msgs);
      
      // Mark unread customer messages as read
      const unreadMsgs = msgs.filter(
        (msg) => !msg.read_at && !msg.is_from_support
      );
      for (const msg of unreadMsgs) {
        try {
          await markMessageRead(msg.id);
        } catch (e) {
          console.error("Failed to mark message as read:", e);
        }
      }
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  };

  const loadCustomerDetails = async () => {
    if (!selectedConversation) return;
    
    try {
      const details = await fetchCustomerDetails(selectedConversation.id);
      setCustomerDetails(details);
    } catch (err) {
      console.error("Failed to load customer details:", err);
    }
  };

  const handleClaimConversation = async (conversationId) => {
    setLoading(true);
    setError("");
    try {
      await claimConversation(conversationId);
      await loadQueue();
      if (selectedConversation?.id === conversationId) {
        await loadConversation(conversationId);
      }
    } catch (err) {
      setError(err.message || "Failed to claim conversation");
    } finally {
      setLoading(false);
    }
  };

  const handleResolveConversation = async () => {
    if (!selectedConversation) return;
    
    setLoading(true);
    setError("");
    try {
      await resolveConversation(selectedConversation.id);
      await loadQueue();
      setSelectedConversation(null);
      setMessages([]);
      setCustomerDetails(null);
    } catch (err) {
      setError(err.message || "Failed to resolve conversation");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!inputMessage.trim() && attachedFiles.length === 0) || !selectedConversation || isSending) {
      return;
    }

    setIsSending(true);
    setError("");

    try {
      const text = inputMessage.trim();
      const files = attachedFiles.map((f) => f.file);
      
      await sendMessage(selectedConversation.id, text, files);
      
      setInputMessage("");
      setAttachedFiles([]);
      await loadMessages();
    } catch (err) {
      setError(err.message || "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter((file) => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      const validTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/pdf",
        "video/mp4",
        "video/webm",
      ];

      if (file.size > maxSize) {
        alert(`File ${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }
      if (!validTypes.includes(file.type)) {
        alert(
          `File ${file.name} has an unsupported type. Please use images, PDFs, or videos.`
        );
        return false;
      }
      return true;
    });

    setAttachedFiles((prev) => [
      ...prev,
      ...validFiles.map((file) => ({
        id: Date.now() + Math.random(),
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      })),
    ]);
  };

  const removeFile = (fileId) => {
    setAttachedFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === fileId);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter((f) => f.id !== fileId);
    });
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  if (authLoading) {
    return <div className="container">Loading authentication...</div>;
  }

  if (!isAuthenticated || !isSupportAgent(user)) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="support-dashboard">
      <header className="dashboard-header">
        <h1>Support Agent Dashboard</h1>
        <p className="muted">Manage customer conversations and provide real-time support.</p>
      </header>

      {error && <div className="alert error">{error}</div>}

      <div className="support-dashboard-layout">
        {/* Conversation Queue */}
        <div className="conversation-queue">
          <h2>Conversation Queue</h2>
          <button onClick={loadQueue} disabled={loading} className="btn-refresh">
            Refresh
          </button>
          {loading && <div className="loading">Loading...</div>}
          {queue.length === 0 ? (
            <p className="muted">No open conversations in queue.</p>
          ) : (
            <div className="queue-list">
              {queue.map((conv) => (
                <div
                  key={conv.id}
                  className={`queue-item ${
                    selectedConversation?.id === conv.id ? "active" : ""
                  }`}
                  onClick={() => loadConversation(conv.id)}
                >
                  <div className="queue-item-header">
                    <strong>{conv.customer_name || "Guest"}</strong>
                    {conv.unread_count > 0 && (
                      <span className="unread-badge">{conv.unread_count}</span>
                    )}
                  </div>
                  <div className="queue-item-meta">
                    <span>{conv.customer_email || "Anonymous"}</span>
                    <span className={`status-badge status-${conv.status}`}>{conv.status}</span>
                  </div>
                  {conv.status === "claimed" && conv.support_agent_name && (
                    <div className="queue-item-claimed">
                      Claimed by: {conv.support_agent_name}
                    </div>
                  )}
                  {conv.last_message_preview && (
                    <div className="queue-item-preview">{conv.last_message_preview}</div>
                  )}
                  {conv.status === "open" && (
                    <button
                      className="btn-claim"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClaimConversation(conv.id);
                      }}
                    >
                      Claim
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Conversation View */}
        <div className="conversation-view">
          {selectedConversation ? (
            <>
              <div className="conversation-header">
                <div>
                  <h3>
                    {selectedConversation.customer_name || "Guest"}
                    {selectedConversation.support_agent_name && (
                      <span className="agent-badge">
                        Assigned to: {selectedConversation.support_agent_name}
                      </span>
                    )}
                  </h3>
                  <p>{selectedConversation.customer_email || "Anonymous"}</p>
                </div>
                <button
                  className="btn-resolve"
                  onClick={handleResolveConversation}
                  disabled={loading}
                >
                  Resolve
                </button>
              </div>

              {/* Customer Details Sidebar */}
              {customerDetails && customerDetails.customer && (
                <div className="customer-details-panel">
                  <h4>Customer Information</h4>
                  <div className="customer-info-section">
                    <strong>Email:</strong> {customerDetails.customer.email}
                  </div>
                  <div className="customer-info-section">
                    <strong>Orders:</strong> {customerDetails.orders_count}
                    {customerDetails.orders.length > 0 && (
                      <ul>
                        {customerDetails.orders.map((order) => (
                          <li key={order.id}>
                            Order #{order.id} - {order.status} - ${order.total_price}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="customer-info-section">
                    <strong>Cart Items:</strong> {customerDetails.cart_items_count}
                  </div>
                  <div className="customer-info-section">
                    <strong>Wishlist Items:</strong> {customerDetails.wishlist_items_count}
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="messages-container">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`message ${message.is_from_support ? "support-message" : "customer-message"}`}
                  >
                    <div className="message-content">
                      {message.text && <div className="message-text">{message.text}</div>}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="message-attachments">
                          {message.attachments.map((attachment, idx) => (
                            <div key={idx} className="attachment">
                              {attachment.file_type?.startsWith("image/") ? (
                                <img
                                  src={attachment.file_url}
                                  alt={attachment.file_name}
                                  className="attachment-preview"
                                />
                              ) : (
                                <a
                                  href={attachment.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {attachment.file_name} ({attachment.file_size_display})
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="message-time">{formatTime(message.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <form className="message-input-form" onSubmit={handleSendMessage}>
                {attachedFiles.length > 0 && (
                  <div className="attachments-preview">
                    {attachedFiles.map((file) => (
                      <div key={file.id} className="attachment-item">
                        {file.preview ? (
                          <img src={file.preview} alt={file.name} className="attachment-preview" />
                        ) : (
                          <span>{file.name}</span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeFile(file.id)}
                          className="btn-remove"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="input-wrapper">
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    multiple
                    accept="image/*,application/pdf,video/*"
                    id="file-input"
                    style={{ display: "none" }}
                  />
                  <label htmlFor="file-input" className="btn-attach">
                    📎
                  </label>
                  <input
                    type="text"
                    className="message-input"
                    placeholder="Type your message..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    disabled={isSending}
                  />
                  <button
                    type="submit"
                    className="btn-send"
                    disabled={(!inputMessage.trim() && attachedFiles.length === 0) || isSending}
                  >
                    {isSending ? "..." : "Send"}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="no-conversation">
              <p>Select a conversation from the queue to start.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
