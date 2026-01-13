from rest_framework import serializers
from .models import Conversation, Message, MessageAttachment
from users.serializers import CustomerProfileSerializer


class MessageAttachmentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    file_size_display = serializers.SerializerMethodField()
    
    class Meta:
        model = MessageAttachment
        fields = ['id', 'file', 'file_url', 'file_name', 'file_size', 'file_size_display', 'file_type', 'uploaded_at']
        read_only_fields = ['file_size', 'file_type', 'uploaded_at']
    
    def get_file_size_display(self, obj):
        """Return human-readable file size"""
        return obj.file_size_display
    
    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class MessageSerializer(serializers.ModelSerializer):
    attachments = MessageAttachmentSerializer(many=True, read_only=True)
    sender_name = serializers.SerializerMethodField()
    sender_email = serializers.SerializerMethodField()
    is_from_support = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Message
        fields = [
            'id', 'conversation', 'sender', 'sender_name', 'sender_email',
            'text', 'attachments', 'created_at', 'read_at', 'is_from_support'
        ]
        read_only_fields = ['sender', 'created_at', 'read_at', 'is_from_support']
    
    def get_sender_name(self, obj):
        if obj.sender:
            return f"{obj.sender.first_name} {obj.sender.last_name}".strip() or obj.sender.username
        return obj.sender_name or 'Guest'
    
    def get_sender_email(self, obj):
        if obj.sender:
            return obj.sender.email
        return obj.sender_email


class ConversationSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True, required=False)
    customer_name = serializers.SerializerMethodField()
    customer_email = serializers.SerializerMethodField()
    support_agent_name = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    
    class Meta:
        model = Conversation
        fields = [
            'id', 'customer', 'support_agent', 'status', 'guest_email', 'guest_name',
            'customer_name', 'customer_email', 'support_agent_name',
            'created_at', 'updated_at', 'claimed_at', 'resolved_at',
            'messages', 'unread_count', 'last_message'
        ]
        read_only_fields = ['created_at', 'updated_at', 'claimed_at', 'resolved_at']
    
    def get_customer_name(self, obj):
        """Return customer name (from user or guest)"""
        try:
            if obj.customer:
                return f"{obj.customer.first_name} {obj.customer.last_name}".strip() or obj.customer.username
            return obj.guest_name or 'Guest'
        except Exception:
            return 'Guest'
    
    def get_customer_email(self, obj):
        """Return customer email (from user or guest)"""
        try:
            if obj.customer:
                return obj.customer.email
            return obj.guest_email or 'Anonymous'
        except Exception:
            return 'Anonymous'
    
    def get_support_agent_name(self, obj):
        try:
            if obj.support_agent:
                return f"{obj.support_agent.first_name} {obj.support_agent.last_name}".strip() or obj.support_agent.username
        except Exception:
            pass
        return None
    
    def get_unread_count(self, obj):
        """Count unread messages for the current user"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 0
        
        try:
            # Count messages not from the current user that haven't been read
            if request.user.role == 'Support Agent':
                # For agents, count customer messages that are unread
                return obj.messages.filter(
                    sender__isnull=True,  # Guest messages
                    read_at__isnull=True
                ).count() + obj.messages.filter(
                    sender__isnull=False,
                    sender__role='Customer',
                    read_at__isnull=True
                ).count()
            else:
                # For customers, count support agent messages that are unread
                return obj.messages.filter(
                    sender__isnull=False,
                    sender__role='Support Agent',
                    read_at__isnull=True
                ).count()
        except Exception:
            # If there's any error (e.g., messages not loaded), return 0
            return 0
    
    def get_last_message(self, obj):
        """Get the last message in the conversation"""
        try:
            last_msg = obj.messages.last()
            if last_msg:
                return MessageSerializer(last_msg, context=self.context).data
        except Exception:
            pass
        return None


class ConversationListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for conversation lists"""
    customer_name = serializers.SerializerMethodField()
    customer_email = serializers.SerializerMethodField()
    support_agent_name = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    last_message_preview = serializers.SerializerMethodField()
    
    class Meta:
        model = Conversation
        fields = [
            'id', 'customer', 'support_agent', 'status', 'customer_name', 'customer_email',
            'support_agent_name', 'created_at', 'updated_at', 'unread_count', 'last_message_preview'
        ]
    
    def get_customer_name(self, obj):
        """Return customer name (from user or guest)"""
        try:
            if obj.customer:
                return f"{obj.customer.first_name} {obj.customer.last_name}".strip() or obj.customer.username
            return obj.guest_name or 'Guest'
        except Exception:
            return 'Guest'
    
    def get_customer_email(self, obj):
        """Return customer email (from user or guest)"""
        try:
            if obj.customer:
                return obj.customer.email
            return obj.guest_email or 'Anonymous'
        except Exception:
            return 'Anonymous'
    
    def get_support_agent_name(self, obj):
        try:
            if obj.support_agent:
                return f"{obj.support_agent.first_name} {obj.support_agent.last_name}".strip() or obj.support_agent.username
        except Exception:
            pass
        return None
    
    def get_unread_count(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 0
        
        try:
            if request.user.role == 'Support Agent':
                return obj.messages.filter(
                    sender__isnull=True,
                    read_at__isnull=True
                ).count() + obj.messages.filter(
                    sender__isnull=False,
                    sender__role='Customer',
                    read_at__isnull=True
                ).count()
            else:
                return obj.messages.filter(
                    sender__isnull=False,
                    sender__role='Support Agent',
                    read_at__isnull=True
                ).count()
        except Exception:
            return 0
    
    def get_last_message_preview(self, obj):
        try:
            last_msg = obj.messages.last()
            if last_msg:
                if last_msg.text:
                    return last_msg.text[:100] + ('...' if len(last_msg.text) > 100 else '')
                return '[File attachment]'
        except Exception:
            pass
        return None
