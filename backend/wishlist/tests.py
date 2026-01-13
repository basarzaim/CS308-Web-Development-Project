from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from products.models import Product
from wishlist.models import Wishlist

User = get_user_model()


class WishlistModelTest(TestCase):
    """Test Wishlist model functionality"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123'
        )
        self.product = Product.objects.create(
            name='Test Product',
            price=99.99,
            stock=10
        )
    
    def test_wishlist_creation(self):
        """Test creating a wishlist item"""
        wishlist_item = Wishlist.objects.create(
            user=self.user,
            product=self.product
        )
        self.assertEqual(wishlist_item.user, self.user)
        self.assertEqual(wishlist_item.product, self.product)
    
    def test_wishlist_str_representation(self):
        """Test wishlist string representation"""
        wishlist_item = Wishlist.objects.create(
            user=self.user,
            product=self.product
        )
        self.assertIn(self.user.email, str(wishlist_item))
        self.assertIn(self.product.name, str(wishlist_item))
    
    def test_wishlist_unique_together(self):
        """Test that user and product combination is unique"""
        Wishlist.objects.create(
            user=self.user,
            product=self.product
        )
        # Try to create duplicate
        with self.assertRaises(Exception):
            Wishlist.objects.create(
                user=self.user,
                product=self.product
            )


class WishlistViewTest(TestCase):
    """Test Wishlist API views"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123'
        )
        self.product = Product.objects.create(
            name='Test Product',
            price=99.99,
            stock=10
        )
        self.product2 = Product.objects.create(
            name='Another Product',
            price=49.99,
            stock=5
        )
    
    def test_add_to_wishlist(self):
        """Test adding product to wishlist"""
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/wishlist/', {
            'product': self.product.id
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Wishlist.objects.filter(user=self.user, product=self.product).exists())
    
    def test_add_duplicate_to_wishlist(self):
        """Test adding duplicate product to wishlist"""
        Wishlist.objects.create(user=self.user, product=self.product)
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/wishlist/', {
            'product': self.product.id
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already in wishlist', response.data['detail'].lower())
    
    def test_list_wishlist(self):
        """Test listing wishlist items"""
        Wishlist.objects.create(user=self.user, product=self.product)
        Wishlist.objects.create(user=self.user, product=self.product2)
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/wishlist/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
    
    def test_list_wishlist_unauthenticated(self):
        """Test listing wishlist without authentication"""
        response = self.client.get('/api/wishlist/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_delete_wishlist_item(self):
        """Test deleting wishlist item"""
        wishlist_item = Wishlist.objects.create(user=self.user, product=self.product)
        self.client.force_authenticate(user=self.user)
        response = self.client.delete(f'/api/wishlist/{wishlist_item.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Wishlist.objects.filter(id=wishlist_item.id).exists())
    
    def test_delete_wishlist_by_product_id(self):
        """Test deleting wishlist item by product ID"""
        Wishlist.objects.create(user=self.user, product=self.product)
        self.client.force_authenticate(user=self.user)
        response = self.client.delete(f'/api/wishlist/product/{self.product.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Wishlist.objects.filter(user=self.user, product=self.product).exists())
    
    def test_add_nonexistent_product_to_wishlist(self):
        """Test adding non-existent product to wishlist"""
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/wishlist/', {
            'product': 99999  # Non-existent ID
        })
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('not found', response.data['detail'].lower())
