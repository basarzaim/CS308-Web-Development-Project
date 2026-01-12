from django.db import models
from django.conf import settings


class Conversation(models.Model):
    """
    Represents a chat conversation between a customer and support agent.
    """
    STATUS_CHOICES = (
        ('open', 'Open'),
        ('claimed', 'Claimed by Agent'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
    )

    # Customer can be null for guest users
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='conversations'
    )
    
    # Support agent who claimed the conversation
    support_agent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_conversations'
    )
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='open',
        db_index=True
    )
    
    # Guest user information (if not logged in)
    guest_email = models.EmailField(blank=True, null=True)
    guest_name = models.CharField(max_length=255, blank=True, null=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    claimed_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['status', '-created_at']),  # For queue filtering
            models.Index(fields=['customer', '-created_at']),  # For customer's conversations
            models.Index(fields=['support_agent', '-claimed_at']),  # For agent's conversations
        ]
    
    def __str__(self):
        if self.customer:
            return f"Conversation #{self.id} - {self.customer.email} ({self.status})"
        return f"Conversation #{self.id} - Guest: {self.guest_email or 'Anonymous'} ({self.status})"
    
    @property
    def customer_email(self):
        """Return customer email (from user or guest)"""
        if self.customer:
            return self.customer.email
        return self.guest_email or 'Anonymous'
    
    @property
    def customer_name(self):
        """Return customer name (from user or guest)"""
        if self.customer:
            return f"{self.customer.first_name} {self.customer.last_name}".strip() or self.customer.username
        return self.guest_name or 'Guest'


class Message(models.Model):
    """
    Represents a message in a conversation.
    """
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    
    # Sender can be customer (user or guest) or support agent
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sent_messages'
    )
    
    # For guest messages
    sender_name = models.CharField(max_length=255, blank=True, null=True)
    sender_email = models.EmailField(blank=True, null=True)
    
    # Message content
    text = models.TextField(blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['conversation', '-created_at']),  # For conversation messages
        ]
    
    def __str__(self):
        sender_info = self.sender.email if self.sender else (self.sender_name or 'Guest')
        preview = (self.text[:50] + '...') if self.text and len(self.text) > 50 else (self.text or '[File]')
        return f"Message from {sender_info}: {preview}"
    
    @property
    def is_from_support(self):
        """Check if message is from a support agent"""
        if self.sender:
            return self.sender.role == 'Support Agent' or self.sender.is_staff
        return False


class MessageAttachment(models.Model):
    """
    File attachments for messages (PDFs, images, videos).
    """
    message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name='attachments'
    )
    
    file = models.FileField(upload_to='support/attachments/%Y/%m/%d/')
    file_name = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField()  # Size in bytes
    file_type = models.CharField(max_length=100)  # MIME type
    
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return f"{self.file_name} ({self.message.id})"
    
    @property
    def file_size_display(self):
        """Return human-readable file size"""
        if self.file_size < 1024:
            return f"{self.file_size} B"
        elif self.file_size < 1024 * 1024:
            return f"{self.file_size / 1024:.1f} KB"
        else:
            return f"{self.file_size / (1024 * 1024):.1f} MB"
