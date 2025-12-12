from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from decimal import Decimal
from products.models import Product
from cart.models import CartItem
from .models import Order, OrderItem

Customer = get_user_model()


class OrderModelTest(TestCase):
    def setUp(self):
        self.user = Customer.objects.create_user(
            email='order@example.com',
            username='orderuser',
            password='pass123'
        )

    def test_create_order_basic(self):
        order = Order.objects.create(
            user=self.user,
            total_price=Decimal('150.00'),
            status='processing'
        )
        self.assertEqual(order.status, 'processing')
        self.assertEqual(order.total_price, Decimal('150.00'))

    def test_order_discounted_total_price_calculation(self):
        order = Order.objects.create(
            user=self.user,
            total_price=Decimal('100.00'),
            discount_percentage=Decimal('10.00')
        )
        discounted = order.discounted_total_price()
        self.assertEqual(discounted, Decimal('90.00'))


class OrderAPITest(APITestCase):
    def setUp(self):
        self.user = Customer.objects.create_user(
            email='orderapi@example.com',
            username='orderapiuser',
            password='pass123'
        )
        self.product = Product.objects.create(
            name='Order Product',
            price=100.00,
            stock=10
        )

    def test_checkout_requires_auth_401(self):
        response = self.client.post('/api/orders/checkout/', {})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_checkout_with_cart_items_success(self):
        CartItem.objects.create(
            user=self.user,
            product=self.product,
            quantity=2
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/orders/checkout/', {
            'shipping': {
                'name': 'John Doe',
                'address': '123 Main St',
                'city': 'Ankara',
                'phone': '5551234'
            }
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Order.objects.filter(user=self.user).exists())

    def test_list_orders_requires_auth_401(self):
        response = self.client.get('/api/orders/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
