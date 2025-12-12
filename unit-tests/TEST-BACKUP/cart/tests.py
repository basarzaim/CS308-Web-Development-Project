from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from products.models import Product
from .models import CartItem

Customer = get_user_model()


class CartItemModelTest(TestCase):
    def setUp(self):
        self.user = Customer.objects.create_user(
            email='cart@example.com',
            username='cartuser',
            password='pass123'
        )
        self.product = Product.objects.create(
            name='Test Product',
            price=50.00,
            stock=10
        )

    def test_create_cart_item(self):
        item = CartItem.objects.create(
            user=self.user,
            product=self.product,
            quantity=2
        )
        self.assertEqual(item.quantity, 2)
        self.assertEqual(str(item), f'{self.user.email}: {self.product.name} x 2')

    def test_cart_item_unique_together(self):
        CartItem.objects.create(
            user=self.user,
            product=self.product,
            quantity=1
        )
        with self.assertRaises(Exception):
            CartItem.objects.create(
                user=self.user,
                product=self.product,
                quantity=2
            )


class CartAPITest(APITestCase):
    def setUp(self):
        self.user = Customer.objects.create_user(
            email='cartapi@example.com',
            username='cartapiuser',
            password='pass123'
        )
        self.product = Product.objects.create(
            name='Cart Product',
            price=75.00,
            stock=5
        )

    def test_add_to_cart_authenticated(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/cart/add/', {
            'product_id': self.product.id,
            'quantity': 2
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(CartItem.objects.filter(user=self.user, product=self.product).exists())

    def test_add_to_cart_out_of_stock(self):
        out_of_stock_product = Product.objects.create(
            name='Out of Stock',
            price=100.00,
            stock=0
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/cart/add/', {
            'product_id': out_of_stock_product.id,
            'quantity': 1
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_cart_authenticated(self):
        CartItem.objects.create(
            user=self.user,
            product=self.product,
            quantity=3
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/cart/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['cart']), 1)

    def test_update_cart_item_requires_auth_401(self):
        item = CartItem.objects.create(
            user=self.user,
            product=self.product,
            quantity=1
        )
        response = self.client.patch(f'/api/cart/{item.id}/', {'quantity': 2})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_remove_cart_item_requires_auth_401(self):
        item = CartItem.objects.create(
            user=self.user,
            product=self.product,
            quantity=1
        )
        response = self.client.delete(f'/api/cart/{item.id}/remove/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
