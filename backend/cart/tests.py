from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from products.models import Product
from cart.models import CartItem

User = get_user_model()


class CartModelTest(TestCase):
    """Test CartItem model functionality"""
    
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
    
    def test_cart_item_creation(self):
        """Test creating a cart item"""
        cart_item = CartItem.objects.create(
            user=self.user,
            product=self.product,
            quantity=2
        )
        self.assertEqual(cart_item.user, self.user)
        self.assertEqual(cart_item.product, self.product)
        self.assertEqual(cart_item.quantity, 2)
    
    def test_cart_item_str_representation(self):
        """Test cart item string representation"""
        cart_item = CartItem.objects.create(
            user=self.user,
            product=self.product,
            quantity=3
        )
        self.assertIn(self.user.email, str(cart_item))
        self.assertIn(self.product.name, str(cart_item))
    
    def test_cart_item_unique_together(self):
        """Test that user and product combination is unique"""
        CartItem.objects.create(
            user=self.user,
            product=self.product,
            quantity=1
        )
        # Try to create duplicate
        with self.assertRaises(Exception):
            CartItem.objects.create(
                user=self.user,
                product=self.product,
                quantity=2
            )


class CartViewTest(TestCase):
    """Test cart API views"""
    
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
        self.out_of_stock_product = Product.objects.create(
            name='Out of Stock Product',
            price=49.99,
            stock=0
        )
    
    def test_add_to_cart_authenticated(self):
        """Test adding item to cart when authenticated"""
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/cart/add/', {
            'product_id': self.product.id,
            'quantity': 2
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(CartItem.objects.count(), 1)
        cart_item = CartItem.objects.first()
        self.assertEqual(cart_item.quantity, 2)
    
    def test_add_to_cart_out_of_stock(self):
        """Test adding out of stock product to cart"""
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/cart/add/', {
            'product_id': self.out_of_stock_product.id,
            'quantity': 1
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('out of stock', response.data.get('error', '').lower())
    
    def test_add_to_cart_exceeds_stock(self):
        """Test adding more items than available stock"""
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/cart/add/', {
            'product_id': self.product.id,
            'quantity': 15  # More than stock (10)
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_list_cart_authenticated(self):
        """Test listing cart items when authenticated"""
        CartItem.objects.create(
            user=self.user,
            product=self.product,
            quantity=2
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/cart/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['cart']), 1)
        self.assertEqual(response.data['cart'][0]['product_id'], self.product.id)
    
    def test_update_cart_item(self):
        """Test updating cart item quantity"""
        cart_item = CartItem.objects.create(
            user=self.user,
            product=self.product,
            quantity=2
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(f'/api/cart/{cart_item.id}/', {
            'quantity': 5
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        cart_item.refresh_from_db()
        self.assertEqual(cart_item.quantity, 5)
    
    def test_remove_cart_item(self):
        """Test removing cart item by setting quantity to 0"""
        cart_item = CartItem.objects.create(
            user=self.user,
            product=self.product,
            quantity=2
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(f'/api/cart/{cart_item.id}/', {
            'quantity': 0
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(CartItem.objects.count(), 0)
    
    def test_delete_cart_item(self):
        """Test deleting cart item"""
        cart_item = CartItem.objects.create(
            user=self.user,
            product=self.product,
            quantity=2
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.delete(f'/api/cart/{cart_item.id}/remove/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(CartItem.objects.count(), 0)
    
    def test_clear_cart(self):
        """Test clearing all cart items"""
        CartItem.objects.create(
            user=self.user,
            product=self.product,
            quantity=2
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.delete('/api/cart/clear/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(CartItem.objects.filter(user=self.user).count(), 0)
