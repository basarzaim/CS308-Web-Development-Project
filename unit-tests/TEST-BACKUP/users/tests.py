from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

Customer = get_user_model()


class CustomerModelTest(TestCase):
    def test_customer_email_unique_constraint(self):
        Customer.objects.create_user(
            email='unique@example.com',
            username='user1',
            password='pass123'
        )
        with self.assertRaises(Exception):
            Customer.objects.create_user(
                email='unique@example.com',
                username='user2',
                password='pass123'
            )


class UserRegistrationAPITest(APITestCase):
    def test_register_user_success(self):
        data = {
            'email': 'newuser@example.com',
            'username': 'newuser',
            'password': 'securepass123',
            'first_name': 'John',
            'last_name': 'Doe'
        }
        response = self.client.post('/api/users/register/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Customer.objects.filter(email='newuser@example.com').exists())

    def test_register_duplicate_email_fails(self):
        Customer.objects.create_user(
            email='existing@example.com',
            username='existing',
            password='pass123'
        )
        data = {
            'email': 'existing@example.com',
            'username': 'newuser',
            'password': 'securepass123'
        }
        response = self.client.post('/api/users/register/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class UserLoginAPITest(APITestCase):
    def setUp(self):
        self.user = Customer.objects.create_user(
            email='login@example.com',
            username='loginuser',
            password='testpass123'
        )

    def test_login_success_returns_tokens(self):
        data = {
            'email': 'login@example.com',
            'password': 'testpass123'
        }
        response = self.client.post('/api/users/login/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_login_invalid_credentials_401(self):
        data = {
            'email': 'login@example.com',
            'password': 'wrongpassword'
        }
        response = self.client.post('/api/users/login/', data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
