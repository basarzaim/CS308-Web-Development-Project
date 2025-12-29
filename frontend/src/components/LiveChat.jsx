import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchCurrentUser } from "../api/users";
import { fetchCart } from "../api/cart";
import { fetchUserOrders } from "../api/orders";
import "./LiveChat.css";

const LiveChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showCustomerInfo, setShowCustomerInfo] = useState(false);
  const [customerContext, setCustomerContext] = useState(null);
  const [loadingContext, setLoadingContext] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const messagesEndRef = useRef(null);
  const chatWindowRef = useRef(null);
  const fileInputRef = useRef(null);
  const { user, isAuthenticated } = useAuth();

  // Load chat history and unread count from localStorage
  useEffect(() => {
    const savedMessages = localStorage.getItem("liveChatHistory");
    const savedUnreadCount = localStorage.getItem("liveChatUnreadCount");
    
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        setMessages(parsedMessages);
      } catch (e) {
        console.error("Failed to load chat history:", e);
      }
    } else {
      // Initial welcome message
      const welcomeMessage = {
        id: Date.now(),
        text: "Hello! Welcome to our support chat. How can I help you today?",
        sender: "support",
        timestamp: new Date().toISOString(),
      };
      setMessages([welcomeMessage]);
    }

    // Load unread count
    if (savedUnreadCount) {
      setUnreadCount(parseInt(savedUnreadCount, 10) || 0);
    }
  }, []);

  // Fetch customer context when chat opens and user is authenticated
  useEffect(() => {
    if (isOpen && isAuthenticated && !customerContext) {
      loadCustomerContext();
    }
  }, [isOpen, isAuthenticated]);

  const loadCustomerContext = async () => {
    if (!isAuthenticated) return;
    
    setLoadingContext(true);
    try {
      const [profile, cart, orders] = await Promise.all([
        fetchCurrentUser().catch(() => null),
        fetchCart().catch(() => []),
        fetchUserOrders().catch(() => []),
      ]);

      setCustomerContext({
        profile: profile || user,
        cart: Array.isArray(cart) ? cart : [],
        orders: Array.isArray(orders) ? orders : [],
        loadedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to load customer context:", error);
      setCustomerContext({
        profile: user,
        cart: [],
        orders: [],
        error: "Failed to load some information",
      });
    } finally {
      setLoadingContext(false);
    }
  };

  // Save messages to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("liveChatHistory", JSON.stringify(messages));
    }
  }, [messages]);

  // Save unread count to localStorage
  useEffect(() => {
    localStorage.setItem("liveChatUnreadCount", unreadCount.toString());
  }, [unreadCount]);

  // Track unread messages when chat is closed
  useEffect(() => {
    if (!isOpen && messages.length > 0) {
      const lastSeenMessageId = localStorage.getItem("lastSeenMessageId");
      if (lastSeenMessageId) {
        const lastSeenId = parseInt(lastSeenMessageId, 10);
        const unreadSupportMessages = messages.filter(
          (msg) => msg.sender === "support" && msg.id > lastSeenId
        );
        setUnreadCount(unreadSupportMessages.length);
      } else {
        const supportMessages = messages.filter((msg) => msg.sender === "support");
        setUnreadCount(Math.max(0, supportMessages.length - 1));
      }
    }
  }, [messages, isOpen]);

  // Clear unread count when chat is opened
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      if (messages.length > 0) {
        const lastMessageId = Math.max(...messages.map((msg) => msg.id));
        localStorage.setItem("lastSeenMessageId", lastMessageId.toString());
      }
    }
  }, [isOpen, messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Simulate support agent response (mock - replace with real API/WebSocket later)
  const simulateSupportResponse = (userMessage, context) => {
    const responses = [
      "Thank you for your message. I'm here to help!",
      "I understand your concern. Let me assist you with that.",
      "That's a great question! Let me look into that for you.",
      "I'll be happy to help you with that. Can you provide more details?",
      "Thank you for contacting us. Our team will get back to you shortly.",
    ];
    
    const lowerMessage = userMessage.toLowerCase();
    if (lowerMessage.includes("order") || lowerMessage.includes("shipping")) {
      const orderCount = context?.orders?.length || 0;
      if (orderCount > 0) {
        return `I can help you with your order. I can see you have ${orderCount} order(s) in your account. Please provide your order number if you have one.`;
      }
      return "I can help you with your order. Please provide your order number if you have one.";
    } else if (lowerMessage.includes("refund") || lowerMessage.includes("return")) {
      return "I can assist you with returns and refunds. Please share your order details.";
    } else if (lowerMessage.includes("product") || lowerMessage.includes("item")) {
      const cartCount = context?.cart?.length || 0;
      if (cartCount > 0) {
        return `I'd be happy to help you find the right product. I notice you have ${cartCount} item(s) in your cart. What are you looking for?`;
      }
      return "I'd be happy to help you find the right product. What are you looking for?";
    } else if (lowerMessage.includes("account") || lowerMessage.includes("profile")) {
      return "I can help you with account-related questions. What do you need assistance with?";
    } else {
      return responses[Math.floor(Math.random() * responses.length)];
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'video/mp4', 'video/webm'];
      
      if (file.size > maxSize) {
        alert(`File ${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }
      if (!validTypes.includes(file.type)) {
        alert(`File ${file.name} has an unsupported type. Please use images, PDFs, or videos.`);
        return false;
      }
      return true;
    });

    setAttachedFiles(prev => [...prev, ...validFiles.map(file => ({
      id: Date.now() + Math.random(),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    }))]);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (fileId) => {
    setAttachedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim() && attachedFiles.length === 0) return;

    // Prepare customer context for support
    const contextData = customerContext ? {
      userId: customerContext.profile?.id,
      email: customerContext.profile?.email,
      username: customerContext.profile?.username,
      cartItems: customerContext.cart?.length || 0,
      orderCount: customerContext.orders?.length || 0,
      recentOrders: customerContext.orders?.slice(0, 3).map(o => ({
        id: o.id,
        status: o.status,
        total: o.total,
      })),
    } : null;

    const userMessage = {
      id: Date.now(),
      text: inputMessage.trim() || "",
      sender: "user",
      timestamp: new Date().toISOString(),
      files: attachedFiles.map(f => ({
        name: f.name,
        size: f.size,
        type: f.type,
        // In a real implementation, files would be uploaded to server
        // For now, we'll store the file object reference
        file: f.file,
      })),
      context: contextData,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setAttachedFiles([]);
    setIsTyping(true);

    // Simulate support agent typing delay
    setTimeout(() => {
      const supportMessage = {
        id: Date.now() + 1,
        text: simulateSupportResponse(userMessage.text || "File attachment", customerContext),
        sender: "support",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, supportMessage]);
      setIsTyping(false);
      
      if (!isOpen) {
        setUnreadCount((prev) => prev + 1);
      }
    }, 1500);
  };

  const handleClearChat = () => {
    if (window.confirm("Are you sure you want to clear the chat history?")) {
      setMessages([]);
      localStorage.removeItem("liveChatHistory");
      const welcomeMessage = {
        id: Date.now(),
        text: "Hello! Welcome to our support chat. How can I help you today?",
        sender: "support",
        timestamp: new Date().toISOString(),
      };
      setMessages([welcomeMessage]);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        className={`live-chat-button ${isOpen ? "hidden" : ""}`}
        onClick={() => setIsOpen(true)}
        aria-label="Open live chat"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <span>Support</span>
        {unreadCount > 0 && (
          <span className="live-chat-notification-badge" aria-label={`${unreadCount} unread messages`}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className={`live-chat-window ${showCustomerInfo ? "with-sidebar" : ""}`} ref={chatWindowRef}>
          {/* Chat Header */}
          <div className="live-chat-header">
            <div className="live-chat-header-content">
              <div className="live-chat-status">
                <span className="live-chat-status-dot"></span>
                <span>Support Team</span>
                {isAuthenticated && (
                  <button
                    className="live-chat-info-toggle"
                    onClick={() => setShowCustomerInfo(!showCustomerInfo)}
                    title="Toggle customer information"
                    aria-label="Toggle customer information"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="16" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                  </button>
                )}
              </div>
              <div className="live-chat-header-actions">
                <button
                  className="live-chat-clear-btn"
                  onClick={handleClearChat}
                  title="Clear chat"
                  aria-label="Clear chat history"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
                <button
                  className="live-chat-close-btn"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close chat"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="live-chat-content-wrapper">
            {/* Customer Info Sidebar */}
            {showCustomerInfo && isAuthenticated && (
              <div className="live-chat-sidebar">
                <div className="live-chat-sidebar-header">
                  <h3>Customer Information</h3>
                  <button
                    className="live-chat-sidebar-close"
                    onClick={() => setShowCustomerInfo(false)}
                    aria-label="Close sidebar"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
                <div className="live-chat-sidebar-content">
                  {loadingContext ? (
                    <div className="live-chat-loading">Loading customer information...</div>
                  ) : customerContext ? (
                    <>
                      <div className="customer-info-section">
                        <h4>Profile</h4>
                        <div className="customer-info-item">
                          <strong>Name:</strong> {customerContext.profile?.first_name || customerContext.profile?.username || "N/A"} {customerContext.profile?.last_name || ""}
                        </div>
                        <div className="customer-info-item">
                          <strong>Email:</strong> {customerContext.profile?.email || "N/A"}
                        </div>
                        {customerContext.profile?.phone && (
                          <div className="customer-info-item">
                            <strong>Phone:</strong> {customerContext.profile.phone}
                          </div>
                        )}
                      </div>

                      <div className="customer-info-section">
                        <h4>Cart</h4>
                        <div className="customer-info-item">
                          <strong>Items:</strong> {customerContext.cart?.length || 0}
                        </div>
                        {customerContext.cart?.length > 0 && (
                          <div className="customer-info-list">
                            {customerContext.cart.slice(0, 3).map((item, idx) => (
                              <div key={idx} className="customer-info-list-item">
                                {item.product?.name || item.name || "Product"} × {item.quantity || 1}
                              </div>
                            ))}
                            {customerContext.cart.length > 3 && (
                              <div className="customer-info-list-item">+{customerContext.cart.length - 3} more</div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="customer-info-section">
                        <h4>Orders</h4>
                        <div className="customer-info-item">
                          <strong>Total Orders:</strong> {customerContext.orders?.length || 0}
                        </div>
                        {customerContext.orders?.length > 0 && (
                          <div className="customer-info-list">
                            {customerContext.orders.slice(0, 3).map((order) => (
                              <div key={order.id} className="customer-info-list-item">
                                <div>Order #{order.id}</div>
                                <div className="order-status">{order.status || "N/A"}</div>
                                <div className="order-total">${order.total || order.total_price || 0}</div>
                              </div>
                            ))}
                            {customerContext.orders.length > 3 && (
                              <div className="customer-info-list-item">+{customerContext.orders.length - 3} more</div>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="customer-info-error">Failed to load customer information</div>
                  )}
                </div>
              </div>
            )}

            {/* Messages Container */}
            <div className="live-chat-messages">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`live-chat-message ${
                    message.sender === "user" ? "user-message" : "support-message"
                  }`}
                >
                  <div className="live-chat-message-content">
                    {message.text && (
                      <div className="live-chat-message-text">{message.text}</div>
                    )}
                    {message.files && message.files.length > 0 && (
                      <div className="live-chat-message-files">
                        {message.files.map((file, idx) => {
                          // Try to get preview from stored file object or use data URL
                          const preview = file.preview || (file.file && file.type?.startsWith('image/') ? URL.createObjectURL(file.file) : null);
                          return (
                            <div key={idx} className="live-chat-file-attachment">
                              {preview ? (
                                <img src={preview} alt={file.name} className="live-chat-file-preview" />
                              ) : (
                                <div className="live-chat-file-icon">
                                  {file.type === 'application/pdf' ? '📄' : file.type?.startsWith('video/') ? '🎥' : '📎'}
                                </div>
                              )}
                              <div className="live-chat-file-info">
                                <div className="live-chat-file-name">{file.name}</div>
                                <div className="live-chat-file-size">{formatFileSize(file.size)}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="live-chat-message-time">
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="live-chat-message support-message">
                  <div className="live-chat-message-content">
                    <div className="live-chat-typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <form className="live-chat-input-area" onSubmit={handleSendMessage}>
            {attachedFiles.length > 0 && (
              <div className="live-chat-attachments-preview">
                {attachedFiles.map((file) => (
                  <div key={file.id} className="live-chat-attachment-item">
                    {file.preview ? (
                      <img src={file.preview} alt={file.name} className="live-chat-attachment-preview" />
                    ) : (
                      <div className="live-chat-attachment-icon">
                        {file.type === 'application/pdf' ? '📄' : file.type?.startsWith('video/') ? '🎥' : '📎'}
                      </div>
                    )}
                    <div className="live-chat-attachment-info">
                      <div className="live-chat-attachment-name">{file.name}</div>
                      <div className="live-chat-attachment-size">{formatFileSize(file.size)}</div>
                    </div>
                    <button
                      type="button"
                      className="live-chat-attachment-remove"
                      onClick={() => removeFile(file.id)}
                      aria-label="Remove file"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="live-chat-input-wrapper">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                multiple
                accept="image/*,application/pdf,video/*"
                className="live-chat-file-input"
                id="live-chat-file-input"
                aria-label="Attach file"
              />
              <label htmlFor="live-chat-file-input" className="live-chat-attach-btn" title="Attach file">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                </svg>
              </label>
              <input
                type="text"
                className="live-chat-input"
                placeholder="Type your message..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                autoFocus
              />
              <button
                type="submit"
                className="live-chat-send-btn"
                disabled={!inputMessage.trim() && attachedFiles.length === 0}
                aria-label="Send message"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default LiveChat;
