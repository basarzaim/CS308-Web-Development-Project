from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count

from users.permissions import IsSupportAgent
from .models import Conversation, Message, MessageAttachment
from .serializers import (
    ConversationSerializer, ConversationListSerializer,
    MessageSerializer, MessageAttachmentSerializer
)
from orders.models import Order
from cart.models import CartItem
from wishlist.models import Wishlist


class ConversationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing conversations.
    - Customers can create and view their own conversations
    - Support agents can view all conversations and claim them
    """
    serializer_class = ConversationSerializer
    permission_classes = [AllowAny]  # Allow guests to create conversations
    
    def get_queryset(self):
        user = self.request.user
        
        if not user.is_authenticated:
            # Guests can only access conversations by session/guest_email
            # For now, return empty queryset for guests (they'll create new ones)
            return Conversation.objects.none()
        
        if user.role == 'Support Agent' or user.is_staff:
            # Support agents can see all conversations
            return Conversation.objects.all().prefetch_related(
                'messages', 'messages__attachments', 'customer', 'support_agent'
            ).order_by('-updated_at')
        else:
            # Customers can only see their own conversations
            return Conversation.objects.filter(
                customer=user
            ).prefetch_related(
                'messages', 'messages__attachments', 'support_agent'
            ).order_by('-updated_at')
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ConversationListSerializer
        return ConversationSerializer
    
    def perform_create(self, serializer):
        user = self.request.user
        if user.is_authenticated:
            serializer.save(customer=user)
        else:
            # Guest user - save with guest info from request
            guest_email = self.request.data.get('guest_email', '')
            guest_name = self.request.data.get('guest_name', 'Guest')
            serializer.save(guest_email=guest_email, guest_name=guest_name)
    
    @action(detail=True, methods=['post'], permission_classes=[IsSupportAgent])
    def claim(self, request, pk=None):
        """Support agent claims a conversation"""
        conversation = self.get_object()
        
        if conversation.status == 'resolved' or conversation.status == 'closed':
            return Response(
                {"detail": "Cannot claim a resolved or closed conversation."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        conversation.support_agent = request.user
        conversation.status = 'claimed'
        conversation.claimed_at = timezone.now()
        conversation.save()
        
        serializer = self.get_serializer(conversation)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Mark conversation as resolved"""
        conversation = self.get_object()
        
        # Only support agents or the customer can resolve
        if not request.user.is_authenticated:
            return Response(
                {"detail": "Authentication required."},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        if conversation.customer != request.user and request.user.role != 'Support Agent' and not request.user.is_staff:
            return Response(
                {"detail": "You don't have permission to resolve this conversation."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        conversation.status = 'resolved'
        conversation.resolved_at = timezone.now()
        conversation.save()
        
        serializer = self.get_serializer(conversation)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'], permission_classes=[IsSupportAgent])
    def customer_details(self, request, pk=None):
        """Get customer details for support agent"""
        conversation = self.get_object()
        
        if not conversation.customer:
            return Response({
                "customer": None,
                "message": "This is a guest conversation."
            })
        
        customer = conversation.customer
        
        # Get customer's orders
        orders = Order.objects.filter(user=customer).order_by('-created_at')[:10]
        orders_data = [{
            'id': o.id,
            'status': o.status,
            'total_price': str(o.total_price),
            'created_at': o.created_at,
            'items_count': o.items.count()
        } for o in orders]
        
        # Get cart items
        cart_items = CartItem.objects.filter(user=customer)
        cart_data = [{
            'product_id': item.product.id,
            'product_name': item.product.name,
            'quantity': item.quantity,
            'price': str(item.product.price)
        } for item in cart_items]
        
        # Get wishlist items
        wishlist_items = Wishlist.objects.filter(user=customer)
        wishlist_data = [{
            'product_id': item.product.id,
            'product_name': item.product.name,
            'price': str(item.product.price)
        } for item in wishlist_items]
        
        return Response({
            'customer': {
                'id': customer.id,
                'email': customer.email,
                'username': customer.username,
                'first_name': customer.first_name,
                'last_name': customer.last_name,
            },
            'orders': orders_data,
            'cart': cart_data,
            'wishlist': wishlist_data,
            'orders_count': orders.count(),
            'cart_items_count': cart_items.count(),
            'wishlist_items_count': wishlist_items.count(),
        })


class MessageViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing messages in conversations.
    """
    serializer_class = MessageSerializer
    permission_classes = [AllowAny]  # Allow guests to send messages
    
    def get_queryset(self):
        conversation_id = self.request.query_params.get('conversation')
        if conversation_id:
            return Message.objects.filter(conversation_id=conversation_id).select_related(
                'sender', 'conversation'
            ).prefetch_related('attachments').order_by('created_at')
        return Message.objects.none()
    
    def perform_create(self, serializer):
        conversation_id = self.request.data.get('conversation')
        conversation = get_object_or_404(Conversation, id=conversation_id)
        
        user = self.request.user
        message = None
        if user.is_authenticated:
            message = serializer.save(
                conversation=conversation,
                sender=user
            )
        else:
            # Guest user
            guest_email = self.request.data.get('guest_email', '')
            guest_name = self.request.data.get('guest_name', 'Guest')
            message = serializer.save(
                conversation=conversation,
                sender_name=guest_name,
                sender_email=guest_email
            )
        
        # Handle file attachments
        files = self.request.FILES.getlist('attachments')
        for file in files:
            MessageAttachment.objects.create(
                message=message,
                file=file,
                file_name=file.name,
                file_size=file.size,
                file_type=file.content_type or 'application/octet-stream'
            )
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark message as read"""
        message = self.get_object()
        message.read_at = timezone.now()
        message.save()
        return Response({"status": "marked as read"})


class ConversationQueueView(APIView):
    """
    View for support agents to see the queue of open conversations.
    """
    permission_classes = [IsSupportAgent]
    
    def get(self, request):
        try:
            # Get all open conversations (not claimed, not resolved, not closed)
            open_conversations = Conversation.objects.filter(
                status='open'
            ).prefetch_related(
                'messages', 'messages__attachments', 'customer', 'support_agent'
            ).select_related('customer', 'support_agent').annotate(
                message_count=Count('messages')
            ).order_by('-created_at')
            
            serializer = ConversationListSerializer(open_conversations, many=True, context={'request': request})
            return Response(serializer.data)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {"detail": f"Error loading conversation queue: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CustomerConversationCreateView(APIView):
    """
    View for customers (authenticated or guest) to create a new conversation.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            user = request.user
            
            if user.is_authenticated:
                # Check if user already has an open conversation
                existing = Conversation.objects.filter(
                    customer=user,
                    status__in=['open', 'claimed']
                ).prefetch_related('messages', 'messages__attachments').first()
                
                if existing:
                    serializer = ConversationSerializer(existing, context={'request': request})
                    return Response(serializer.data, status=status.HTTP_200_OK)
                
                conversation = Conversation.objects.create(customer=user, status='open')
            else:
                # Guest user
                guest_email = request.data.get('guest_email', '')
                guest_name = request.data.get('guest_name', 'Guest')
                
                conversation = Conversation.objects.create(
                    guest_email=guest_email,
                    guest_name=guest_name,
                    status='open'
                )
            
            # Refresh from DB to ensure all fields are loaded
            conversation.refresh_from_db()
            
            serializer = ConversationSerializer(conversation, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {"detail": f"Error creating conversation: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
