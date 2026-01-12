from django.contrib import admin
from .models import Conversation, Message, MessageAttachment


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer', 'guest_email', 'support_agent', 'status', 'created_at', 'updated_at')
    list_filter = ('status', 'created_at')
    search_fields = ('customer__email', 'guest_email', 'guest_name')
    readonly_fields = ('created_at', 'updated_at', 'claimed_at', 'resolved_at')


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'conversation', 'sender', 'sender_name', 'sender_email', 'created_at', 'read_at')
    list_filter = ('created_at', 'read_at')
    search_fields = ('text', 'sender__email', 'sender_name', 'sender_email')
    readonly_fields = ('created_at',)


@admin.register(MessageAttachment)
class MessageAttachmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'message', 'file_name', 'file_type', 'file_size', 'uploaded_at')
    list_filter = ('file_type', 'uploaded_at')
    search_fields = ('file_name',)
    readonly_fields = ('uploaded_at',)
