from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ConversationViewSet, MessageViewSet,
    ConversationQueueView, CustomerConversationCreateView
)

router = DefaultRouter()
router.register(r'conversations', ConversationViewSet, basename='conversation')
router.register(r'messages', MessageViewSet, basename='message')

urlpatterns = [
    # Specific paths MUST come before router.urls to avoid being caught by ViewSet
    path('queue/', ConversationQueueView.as_view(), name='conversation-queue'),
    path('start-conversation/', CustomerConversationCreateView.as_view(), name='create-conversation'),
    path('', include(router.urls)),
]
