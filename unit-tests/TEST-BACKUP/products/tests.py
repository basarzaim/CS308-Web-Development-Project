from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from .models import Product


class ProductModelTest(TestCase):
    def test_create_product_basic(self):
        product = Product.objects.create(
            name='Test Product',
            price=99.99,
            stock=10,
            category='phones'
        )
        self.assertEqual(product.name, 'Test Product')
        self.assertEqual(str(product), 'Test Product')

    def test_product_serial_number_unique(self):
        Product.objects.create(
            name='Product 1',
            price=50.00,
            serial_number='SN001'
        )
        with self.assertRaises(Exception):
            Product.objects.create(
                name='Product 2',
                price=60.00,
                serial_number='SN001'
            )


class ProductListAPITest(APITestCase):
    def setUp(self):
        Product.objects.create(
            name='Phone A',
            price=500.00,
            stock=5,
            category='phones'
        )
        Product.objects.create(
            name='Laptop B',
            price=1000.00,
            stock=3,
            category='laptops'
        )

    def test_list_products_public_access(self):
        response = self.client.get('/api/products/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

    def test_filter_products_by_category(self):
        response = self.client.get('/api/products/?category=phones')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['category'], 'phones')

    def test_search_products_by_name(self):
        response = self.client.get('/api/products/?search=Phone')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
