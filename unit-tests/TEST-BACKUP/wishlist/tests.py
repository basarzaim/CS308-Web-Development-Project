from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from products.models import Product
from .models import Wishlist

Customer = get_user_model()


class WishlistModelTest(TestCase):
    def setUp(self):
        self.user = Customer.objects.create_user(
            email='wishlist@example.com',
            username='wishlistuser',
            password='pass123'
        )
        self.product = Product.objects.create(
            name='Wishlist Product',
            price=80.00,
            stock=4
        )

    def test_create_wishlist_item(self):
        item = Wishlist.objects.create(
            user=self.user,
            product=self.product
        )
        self.assertEqual(str(item), f'{self.user.email} - {self.product.name}')

    def test_wishlist_unique_together_constraint(self):
        Wishlist.objects.create(
            user=self.user,
            product=self.product
        )
        with self.assertRaises(Exception):
            Wishlist.objects.create(
                user=self.user,
                product=self.product
            )


class WishlistAPITest(APITestCase):
    def setUp(self):
        self.user = Customer.objects.create_user(
            email='wishlistapi@example.com',
            username='wishlistapiuser',
            password='pass123'
        )
        self.product = Product.objects.create(
            name='Wishlist API Product',
            price=90.00,
            stock=6
        )

    def test_add_to_wishlist_requires_auth_401(self):
        response = self.client.post('/api/wishlist/', {
            'product': self.product.id
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_wishlist_requires_auth_401(self):
        response = self.client.get('/api/wishlist/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
