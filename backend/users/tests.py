from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()


class UserModelTest(TestCase):
    """Test User (Customer) model functionality"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123'
        )
    
    def test_user_creation(self):
        """Test creating a user"""
        self.assertEqual(self.user.email, 'test@example.com')
        self.assertEqual(self.user.username, 'testuser')
        self.assertTrue(self.user.check_password('testpass123'))
    
    def test_user_str_representation(self):
        """Test user string representation"""
        self.assertEqual(str(self.user), 'test@example.com')
    
    def test_user_default_role(self):
        """Test user default role is Customer"""
        self.assertEqual(self.user.role, 'Customer')
    
    def test_user_role_choices(self):
        """Test user can have different roles"""
        self.user.role = 'Product Manager'
        self.user.save()
        self.assertEqual(self.user.role, 'Product Manager')
        
        self.user.role = 'Sales Manager'
        self.user.save()
        self.assertEqual(self.user.role, 'Sales Manager')
    
    def test_user_email_unique(self):
        """Test user email must be unique"""
        with self.assertRaises(Exception):
            User.objects.create_user(
                email='test@example.com',
                username='anotheruser',
                password='testpass123'
            )
    
    def test_user_authentication_with_email(self):
        """Test user can authenticate with email"""
        from django.contrib.auth import authenticate
        user = authenticate(username='test@example.com', password='testpass123')
        self.assertIsNotNone(user)
        self.assertEqual(user, self.user)


class UserViewTest(TestCase):
    """Test User API views"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
    
    def test_register_user(self):
        """Test user registration"""
        response = self.client.post('/api/auth/register/', {
            'email': 'newuser@example.com',
            'username': 'newuser',
            'password': 'newpass123',
            'password2': 'newpass123',
            'first_name': 'New',
            'last_name': 'User'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email='newuser@example.com').exists())
    
    def test_register_user_duplicate_email(self):
        """Test registration with duplicate email fails"""
        response = self.client.post('/api/auth/register/', {
            'email': 'test@example.com',
            'username': 'anotheruser',
            'password': 'testpass123',
            'password2': 'testpass123'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_login_user(self):
        """Test user login"""
        response = self.client.post('/api/auth/login/', {
            'email': 'test@example.com',
            'password': 'testpass123'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = self.client.post('/api/auth/login/', {
            'email': 'test@example.com',
            'password': 'wrongpassword'
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_get_user_profile(self):
        """Test getting user profile"""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/users/profile/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'test@example.com')
        self.assertEqual(response.data['first_name'], 'Test')
    
    def test_update_user_profile(self):
        """Test updating user profile"""
        self.client.force_authenticate(user=self.user)
        response = self.client.patch('/api/users/profile/', {
            'first_name': 'Updated',
            'last_name': 'Name'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, 'Updated')
        self.assertEqual(self.user.last_name, 'Name')
    
    def test_get_user_profile_unauthenticated(self):
        """Test getting profile without authentication"""
        response = self.client.get('/api/users/profile/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_user_me_endpoint(self):
        """Test /api/auth/me/ endpoint"""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/auth/me/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'test@example.com')
