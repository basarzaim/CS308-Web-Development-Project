from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from products.models import Product
from .models import Comment, Rating

Customer = get_user_model()


class CommentModelTest(TestCase):
    def setUp(self):
        self.user = Customer.objects.create_user(
            email='comment@example.com',
            username='commentuser',
            password='pass123'
        )
        self.product = Product.objects.create(
            name='Comment Product',
            price=50.00,
            stock=5
        )

    def test_create_comment_pending_status(self):
        comment = Comment.objects.create(
            product=self.product,
            customer=self.user,
            body='Great product!',
            status='pending'
        )
        self.assertEqual(comment.status, 'pending')
        self.assertEqual(comment.body, 'Great product!')


class RatingModelTest(TestCase):
    def setUp(self):
        self.user = Customer.objects.create_user(
            email='rating@example.com',
            username='ratinguser',
            password='pass123'
        )
        self.product = Product.objects.create(
            name='Rating Product',
            price=75.00,
            stock=3
        )

    def test_rating_unique_together_constraint(self):
        Rating.objects.create(
            product=self.product,
            customer=self.user,
            score=4
        )
        with self.assertRaises(Exception):
            Rating.objects.create(
                product=self.product,
                customer=self.user,
                score=5
            )


class ReviewAPITest(APITestCase):
    def setUp(self):
        self.user = Customer.objects.create_user(
            email='reviewapi@example.com',
            username='reviewapiuser',
            password='pass123'
        )
        self.product = Product.objects.create(
            name='Review Product',
            price=60.00,
            stock=8
        )

    def test_list_comments_public_access(self):
        Comment.objects.create(
            product=self.product,
            customer=self.user,
            body='Approved comment',
            status='approved'
        )
        response = self.client.get(f'/api/products/{self.product.id}/comments/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_create_comment_requires_auth_401(self):
        response = self.client.post(f'/api/products/{self.product.id}/comments/', {
            'body': 'Test comment'
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
