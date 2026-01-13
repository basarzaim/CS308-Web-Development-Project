import api from "./client";

function extractMessage(error, fallback = "An unexpected error occurred") {
  return (
    error?.response?.data?.detail ||
    error?.response?.data?.message ||
    (Array.isArray(error?.response?.data) ? error.response.data[0] : null) ||
    error?.message ||
    fallback
  );
}

/**
 * Create a new conversation (for customers/guests)
 */
export async function createConversation(guestEmail = "", guestName = "Guest") {
  try {
    const { data } = await api.post("/support/start-conversation/", {
      guest_email: guestEmail,
      guest_name: guestName,
    });
    return data;
  } catch (error) {
    throw new Error(extractMessage(error, "Failed to create conversation"));
  }
}

/**
 * Get user's conversations
 */
export async function fetchConversations() {
  try {
    const { data } = await api.get("/support/conversations/");
    return data.results || data;
  } catch (error) {
    throw new Error(extractMessage(error, "Failed to fetch conversations"));
  }
}

/**
 * Get a specific conversation with messages
 */
export async function fetchConversation(conversationId) {
  try {
    const { data } = await api.get(`/support/conversations/${conversationId}/`);
    return data;
  } catch (error) {
    throw new Error(extractMessage(error, "Failed to fetch conversation"));
  }
}

/**
 * Send a message in a conversation
 */
export async function sendMessage(conversationId, text, files = [], guestEmail = "", guestName = "Guest") {
  try {
    const formData = new FormData();
    formData.append("conversation", conversationId);
    if (text) {
      formData.append("text", text);
    }
    if (guestEmail) {
      formData.append("guest_email", guestEmail);
    }
    if (guestName) {
      formData.append("guest_name", guestName);
    }
    
    // Append files
    files.forEach((file) => {
      formData.append("attachments", file);
    });

    const { data } = await api.post("/support/messages/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return data;
  } catch (error) {
    throw new Error(extractMessage(error, "Failed to send message"));
  }
}

/**
 * Get messages for a conversation
 */
export async function fetchMessages(conversationId) {
  try {
    const { data } = await api.get("/support/messages/", {
      params: { conversation: conversationId },
    });
    return data.results || data;
  } catch (error) {
    throw new Error(extractMessage(error, "Failed to fetch messages"));
  }
}

/**
 * Mark a message as read
 */
export async function markMessageRead(messageId) {
  try {
    const { data } = await api.post(`/support/messages/${messageId}/mark_read/`);
    return data;
  } catch (error) {
    throw new Error(extractMessage(error, "Failed to mark message as read"));
  }
}

/**
 * Claim a conversation (for support agents)
 */
export async function claimConversation(conversationId) {
  try {
    const { data } = await api.post(`/support/conversations/${conversationId}/claim/`);
    return data;
  } catch (error) {
    throw new Error(extractMessage(error, "Failed to claim conversation"));
  }
}

/**
 * Resolve a conversation
 */
export async function resolveConversation(conversationId) {
  try {
    const { data } = await api.post(`/support/conversations/${conversationId}/resolve/`);
    return data;
  } catch (error) {
    throw new Error(extractMessage(error, "Failed to resolve conversation"));
  }
}

/**
 * Get conversation queue (for support agents)
 */
export async function fetchConversationQueue() {
  try {
    const { data } = await api.get("/support/queue/");
    return data;
  } catch (error) {
    throw new Error(extractMessage(error, "Failed to fetch conversation queue"));
  }
}

/**
 * Get customer details for a conversation (for support agents)
 */
export async function fetchCustomerDetails(conversationId) {
  try {
    const { data } = await api.get(`/support/conversations/${conversationId}/customer_details/`);
    return data;
  } catch (error) {
    throw new Error(extractMessage(error, "Failed to fetch customer details"));
  }
}
