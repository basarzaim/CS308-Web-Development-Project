from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from products.models import Product
from reviews.models import Rating

User = get_user_model()


class ProductModelTest(TestCase):
    """Test Product model functionality"""
    
    def setUp(self):
        self.product = Product.objects.create(
            name='Test Product',
            price=99.99,
            stock=10,
            category='phones',
            description='Test description'
        )
    
    def test_product_creation(self):
        """Test creating a product"""
        self.assertEqual(self.product.name, 'Test Product')
        self.assertEqual(self.product.price, 99.99)
        self.assertEqual(self.product.stock, 10)
        self.assertEqual(self.product.category, 'phones')
    
    def test_product_str_representation(self):
        """Test product string representation"""
        self.assertEqual(str(self.product), 'Test Product')
    
    def test_product_cost_default(self):
        """Test product cost field can be null"""
        product = Product.objects.create(
            name='Product Without Cost',
            price=50.00,
            stock=5
        )
        self.assertIsNone(product.cost)
    
    def test_product_cost_set(self):
        """Test setting product cost"""
        self.product.cost = 60.00
        self.product.save()
        self.assertEqual(self.product.cost, 60.00)


class ProductViewSetTest(TestCase):
    """Test Product API views"""
    
    def setUp(self):
        self.client = APIClient()
        self.product1 = Product.objects.create(
            name='iPhone 15',
            price=999.99,
            stock=5,
            category='phones',
            description='Latest iPhone'
        )
        self.product2 = Product.objects.create(
            name='Samsung Galaxy',
            price=899.99,
            stock=0,
            category='phones',
            description='Samsung phone'
        )
        self.product3 = Product.objects.create(
            name='MacBook Pro',
            price=1999.99,
            stock=3,
            category='laptops',
            description='Apple laptop'
        )
    
    def test_list_products(self):
        """Test listing all products"""
        response = self.client.get('/api/products/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data['results']), 3)
    
    def test_filter_products_by_category(self):
        """Test filtering products by category"""
        response = self.client.get('/api/products/?category=phones')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        for product in results:
            self.assertEqual(product['category'], 'phones')
    
    def test_filter_products_by_price_range(self):
        """Test filtering products by price range"""
        response = self.client.get('/api/products/?min_price=900&max_price=1000')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        for product in results:
            self.assertGreaterEqual(float(product['price']), 900)
            self.assertLessEqual(float(product['price']), 1000)
    
    def test_filter_products_in_stock(self):
        """Test filtering products that are in stock"""
        response = self.client.get('/api/products/?in_stock=true')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        for product in results:
            self.assertGreater(product['stock'], 0)
    
    def test_search_products_by_name(self):
        """Test searching products by name"""
        response = self.client.get('/api/products/?search=iPhone')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        self.assertGreater(len(results), 0)
        self.assertIn('iPhone', results[0]['name'])
    
    def test_order_products_by_price(self):
        """Test ordering products by price"""
        response = self.client.get('/api/products/?ordering=price')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        prices = [float(p['price']) for p in results]
        self.assertEqual(prices, sorted(prices))
    
    def test_get_product_detail(self):
        """Test retrieving a single product"""
        response = self.client.get(f'/api/products/{self.product1.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'iPhone 15')
        self.assertEqual(response.data['id'], self.product1.id)
    
    def test_product_rating_calculation(self):
        """Test product rating is calculated from reviews"""
        user = User.objects.create_user(
            email='reviewer@example.com',
            username='reviewer',
            password='testpass123'
        )
        Rating.objects.create(
            product=self.product1,
            customer=user,
            score=5
        )
        Rating.objects.create(
            product=self.product1,
            customer=User.objects.create_user(
                email='reviewer2@example.com',
                username='reviewer2',
                password='testpass123'
            ),
            score=4
        )
        response = self.client.get(f'/api/products/{self.product1.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Average of 5 and 4 is 4.5
        self.assertEqual(response.data['rating'], 4.5)
