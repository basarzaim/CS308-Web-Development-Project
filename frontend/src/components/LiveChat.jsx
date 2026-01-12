import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import {
  createConversation,
  fetchConversation,
  sendMessage,
  fetchMessages,
  markMessageRead,
} from "../api/support";
import "./LiveChat.css";

const LiveChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const { user, isAuthenticated } = useAuth();

  // Initialize conversation when component mounts or user changes
  useEffect(() => {
    if (isOpen) {
      initializeConversation();
    }
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [isOpen, isAuthenticated, user]);

  // Poll for new messages when conversation is open
  useEffect(() => {
    if (isOpen && conversation) {
      // Poll every 3 seconds for new messages
      pollingIntervalRef.current = setInterval(() => {
        loadMessages();
      }, 3000);
      
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    }
  }, [isOpen, conversation]);

  const initializeConversation = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Try to create or get existing conversation
      const conv = await createConversation(
        isAuthenticated ? user?.email : "",
        isAuthenticated ? (user?.first_name || user?.username || "User") : "Guest"
      );
      setConversation(conv);
      
      // Load messages
      await loadMessages();
    } catch (err) {
      console.error("Failed to initialize conversation:", err);
      setError(err.message || "Failed to start conversation");
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!conversation) return;
    
    try {
      const msgs = await fetchMessages(conversation.id);
      setMessages(msgs);
      
      // Mark unread messages as read
      const unreadMsgs = msgs.filter(
        (msg) => !msg.read_at && msg.is_from_support
      );
      for (const msg of unreadMsgs) {
        try {
          await markMessageRead(msg.id);
        } catch (e) {
          console.error("Failed to mark message as read:", e);
        }
      }
      
      // Update unread count (only when chat is closed)
      if (!isOpen) {
        const unread = msgs.filter(
          (msg) => !msg.read_at && msg.is_from_support
        ).length;
        setUnreadCount(unread);
      } else {
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Failed to load messages:", err);
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

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!inputMessage.trim() && attachedFiles.length === 0) || !conversation || isSending) {
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const text = inputMessage.trim();
      const files = attachedFiles.map((f) => f.file);
      
      await sendMessage(
        conversation.id,
        text,
        files,
        isAuthenticated ? user?.email : "",
        isAuthenticated ? (user?.first_name || user?.username || "User") : "Guest"
      );

      // Clear input
      setInputMessage("");
      setAttachedFiles([]);

      // Reload messages to get the new one
      await loadMessages();
    } catch (err) {
      console.error("Failed to send message:", err);
      setError(err.message || "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleOpenChat = () => {
    setIsOpen(true);
    setUnreadCount(0);
  };

  const handleCloseChat = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        className={`live-chat-button ${isOpen ? "hidden" : ""}`}
        onClick={handleOpenChat}
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
          <span
            className="live-chat-notification-badge"
            aria-label={`${unreadCount} unread messages`}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="live-chat-window" ref={messagesEndRef}>
          {/* Chat Header */}
          <div className="live-chat-header">
            <div className="live-chat-header-content">
              <div className="live-chat-status">
                <span className="live-chat-status-dot"></span>
                <span>Support Team</span>
              </div>
              <div className="live-chat-header-actions">
                <button
                  className="live-chat-close-btn"
                  onClick={handleCloseChat}
                  aria-label="Close chat"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Messages Container */}
          <div className="live-chat-messages">
            {isLoading ? (
              <div className="live-chat-loading">Loading conversation...</div>
            ) : error ? (
              <div className="live-chat-error">{error}</div>
            ) : messages.length === 0 ? (
              <div className="live-chat-empty">
                <p>Start a conversation with our support team!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`live-chat-message ${
                    message.is_from_support ? "support-message" : "user-message"
                  }`}
                >
                  <div className="live-chat-message-content">
                    {message.text && (
                      <div className="live-chat-message-text">{message.text}</div>
                    )}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="live-chat-message-files">
                        {message.attachments.map((attachment, idx) => (
                          <div key={idx} className="live-chat-file-attachment">
                            {attachment.file_type?.startsWith("image/") ? (
                              <img
                                src={attachment.file_url}
                                alt={attachment.file_name}
                                className="live-chat-file-preview"
                              />
                            ) : (
                              <div className="live-chat-file-icon">
                                {attachment.file_type === "application/pdf"
                                  ? "📄"
                                  : attachment.file_type?.startsWith("video/")
                                  ? "🎥"
                                  : "📎"}
                              </div>
                            )}
                            <div className="live-chat-file-info">
                              <a
                                href={attachment.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="live-chat-file-name"
                              >
                                {attachment.file_name}
                              </a>
                              <div className="live-chat-file-size">
                                {attachment.file_size_display || formatFileSize(attachment.file_size)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="live-chat-message-time">
                      {formatTime(message.created_at)}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form className="live-chat-input-area" onSubmit={handleSendMessage}>
            {error && (
              <div className="live-chat-error-message">{error}</div>
            )}
            {attachedFiles.length > 0 && (
              <div className="live-chat-attachments-preview">
                {attachedFiles.map((file) => (
                  <div key={file.id} className="live-chat-attachment-item">
                    {file.preview ? (
                      <img
                        src={file.preview}
                        alt={file.name}
                        className="live-chat-attachment-preview"
                      />
                    ) : (
                      <div className="live-chat-attachment-icon">
                        {file.type === "application/pdf"
                          ? "📄"
                          : file.type?.startsWith("video/")
                          ? "🎥"
                          : "📎"}
                      </div>
                    )}
                    <div className="live-chat-attachment-info">
                      <div className="live-chat-attachment-name">{file.name}</div>
                      <div className="live-chat-attachment-size">
                        {formatFileSize(file.size)}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="live-chat-attachment-remove"
                      onClick={() => removeFile(file.id)}
                      aria-label="Remove file"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
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
              <label
                htmlFor="live-chat-file-input"
                className="live-chat-attach-btn"
                title="Attach file"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                </svg>
              </label>
              <input
                type="text"
                className="live-chat-input"
                placeholder="Type your message..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={isSending || !conversation}
                autoFocus
              />
              <button
                type="submit"
                className="live-chat-send-btn"
                disabled={
                  (!inputMessage.trim() && attachedFiles.length === 0) ||
                  isSending ||
                  !conversation
                }
                aria-label="Send message"
              >
                {isSending ? (
                  <span>...</span>
                ) : (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default LiveChat;
