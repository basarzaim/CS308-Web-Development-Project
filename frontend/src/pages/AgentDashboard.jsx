// src/pages/AgentDashboard.jsx
import { useState, useEffect, useRef } from "react";
import { useToast } from "../components/ToastContainer";
import "./AgentDashboard.css";

export default function AgentDashboard() {
  const { showSuccess, showError } = useToast();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all, active, waiting, closed
  const messagesEndRef = useRef(null);

  // Load all customer conversations from localStorage
  // In production, this would fetch from a real backend API
  useEffect(() => {
    loadConversations();

    // Poll for new messages every 5 seconds (in production, use WebSocket)
    const interval = setInterval(loadConversations, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadConversations = () => {
    // For demo: Load from localStorage (customer chats)
    // In production: Fetch from API - GET /api/support/conversations/
    try {
      const savedMessages = localStorage.getItem("liveChatHistory");
      if (savedMessages) {
        const messages = JSON.parse(savedMessages);

        // Create a mock conversation structure
        const conversation = {
          id: "demo-conversation-1",
          customerId: "guest-or-user-id",
          customerName: "Customer",
          customerEmail: "customer@example.com",
          status: messages.some(m => m.sender === "user" && !m.responded) ? "waiting" : "active",
          messages: messages,
          unreadCount: messages.filter(m => m.sender === "user" && !m.read).length,
          lastMessageAt: messages[messages.length - 1]?.timestamp || new Date().toISOString(),
          createdAt: messages[0]?.timestamp || new Date().toISOString(),
        };

        setConversations([conversation]);

        // Auto-select if none selected
        if (!selectedConversation) {
          setSelectedConversation(conversation);
        }
      }
    } catch (error) {
      console.error("Failed to load conversations:", error);
    }
  };

  const handleSendReply = (e) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedConversation) return;

    const agentMessage = {
      id: Date.now(),
      text: replyMessage.trim(),
      sender: "support",
      agentName: "Support Agent",
      timestamp: new Date().toISOString(),
      read: false,
    };

    // Add message to selected conversation
    const updatedMessages = [...selectedConversation.messages, agentMessage];

    // Update localStorage (in production, send to API)
    localStorage.setItem("liveChatHistory", JSON.stringify(updatedMessages));

    // Update state
    const updatedConversation = {
      ...selectedConversation,
      messages: updatedMessages,
      lastMessageAt: agentMessage.timestamp,
      status: "active",
    };

    setConversations(prev =>
      prev.map(conv => conv.id === selectedConversation.id ? updatedConversation : conv)
    );
    setSelectedConversation(updatedConversation);
    setReplyMessage("");

    showSuccess("Message sent to customer");

    // Scroll to bottom
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const markAsRead = (conversationId) => {
    setConversations(prev =>
      prev.map(conv => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            unreadCount: 0,
            messages: conv.messages.map(msg => ({ ...msg, read: true })),
          };
        }
        return conv;
      })
    );
  };

  const closeConversation = (conversationId) => {
    setConversations(prev =>
      prev.map(conv =>
        conv.id === conversationId ? { ...conv, status: "closed" } : conv
      )
    );
    showSuccess("Conversation closed");
  };

  const filteredConversations = conversations.filter(conv => {
    if (filterStatus === "all") return true;
    return conv.status === filterStatus;
  });

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const getStatusBadge = (status) => {
    const badges = {
      waiting: { label: "Waiting", className: "status-waiting" },
      active: { label: "Active", className: "status-active" },
      closed: { label: "Closed", className: "status-closed" },
    };
    return badges[status] || badges.active;
  };

  return (
    <div className="agent-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1>Support Agent Dashboard</h1>
        <div className="dashboard-stats">
          <div className="stat-card">
            <span className="stat-value">{conversations.length}</span>
            <span className="stat-label">Total Chats</span>
          </div>
          <div className="stat-card waiting">
            <span className="stat-value">
              {conversations.filter(c => c.status === "waiting").length}
            </span>
            <span className="stat-label">Waiting</span>
          </div>
          <div className="stat-card active">
            <span className="stat-value">
              {conversations.filter(c => c.status === "active").length}
            </span>
            <span className="stat-label">Active</span>
          </div>
        </div>
      </div>

      <div className="dashboard-layout">
        {/* Conversations List */}
        <div className="conversations-sidebar">
          <div className="sidebar-header">
            <h2>Conversations</h2>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="status-filter"
            >
              <option value="all">All</option>
              <option value="waiting">Waiting</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="conversations-list">
            {filteredConversations.length === 0 ? (
              <div className="no-conversations">
                <p>No conversations found</p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`conversation-item ${
                    selectedConversation?.id === conv.id ? "selected" : ""
                  } ${conv.unreadCount > 0 ? "unread" : ""}`}
                  onClick={() => {
                    setSelectedConversation(conv);
                    markAsRead(conv.id);
                  }}
                >
                  <div className="conversation-avatar">
                    {conv.customerName.charAt(0).toUpperCase()}
                  </div>
                  <div className="conversation-info">
                    <div className="conversation-header-row">
                      <span className="customer-name">{conv.customerName}</span>
                      <span className="conversation-time">
                        {formatTime(conv.lastMessageAt)}
                      </span>
                    </div>
                    <div className="conversation-preview">
                      {conv.messages[conv.messages.length - 1]?.text.substring(0, 50) ||
                        "No messages"}
                      ...
                    </div>
                    <div className="conversation-footer">
                      <span className={`status-badge ${getStatusBadge(conv.status).className}`}>
                        {getStatusBadge(conv.status).label}
                      </span>
                      {conv.unreadCount > 0 && (
                        <span className="unread-badge">{conv.unreadCount}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="chat-area">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="chat-header">
                <div className="customer-details">
                  <div className="customer-avatar-large">
                    {selectedConversation.customerName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3>{selectedConversation.customerName}</h3>
                    <p className="customer-email">{selectedConversation.customerEmail}</p>
                  </div>
                </div>
                <div className="chat-actions">
                  <button
                    className="btn-secondary"
                    onClick={() => closeConversation(selectedConversation.id)}
                    disabled={selectedConversation.status === "closed"}
                  >
                    {selectedConversation.status === "closed" ? "Closed" : "Close Chat"}
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="messages-container">
                {selectedConversation.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`message ${message.sender === "support" ? "agent" : "customer"}`}
                  >
                    <div className="message-content">
                      <div className="message-bubble">
                        <p>{message.text}</p>
                        {message.files && message.files.length > 0 && (
                          <div className="message-files">
                            {message.files.map((file, idx) => (
                              <div key={idx} className="file-item">
                                📎 {file.name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="message-meta">
                        <span className="message-sender">
                          {message.sender === "support"
                            ? message.agentName || "Support"
                            : selectedConversation.customerName}
                        </span>
                        <span className="message-time">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                    </div>

                    {/* Customer Context Info */}
                    {message.context && message.sender === "user" && (
                      <div className="customer-context">
                        <strong>Customer Info:</strong>
                        <ul>
                          {message.context.email && <li>Email: {message.context.email}</li>}
                          {message.context.cartItems > 0 && (
                            <li>Cart Items: {message.context.cartItems}</li>
                          )}
                          {message.context.orderCount > 0 && (
                            <li>Orders: {message.context.orderCount}</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Input */}
              <form className="reply-form" onSubmit={handleSendReply}>
                <div className="reply-input-container">
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type your reply..."
                    rows={3}
                    disabled={selectedConversation.status === "closed"}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply(e);
                      }
                    }}
                  />
                </div>
                <div className="reply-actions">
                  <button
                    type="submit"
                    className="btn-send"
                    disabled={
                      !replyMessage.trim() || selectedConversation.status === "closed"
                    }
                  >
                    Send Reply
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="no-conversation-selected">
              <div className="empty-state-icon">💬</div>
              <h3>No conversation selected</h3>
              <p>Select a conversation from the list to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
