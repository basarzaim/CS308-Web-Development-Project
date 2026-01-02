from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Category


class TestCategoryAPI(APITestCase):
    def setUp(self):
        User = get_user_model()

        self.admin = User.objects.create_user(
            username="admin",
            email="admin@example.com",
            password="pass12345",
        )
        self.admin.is_staff = True
        self.admin.is_superuser = True
        self.admin.save(update_fields=["is_staff", "is_superuser"])

        self.user = User.objects.create_user(
            username="user",
            email="user@example.com",
            password="pass12345",
        )

        self.cat = Category.objects.create(slug="phones", name="Phones", is_active=True)

        self.list_url = reverse("category-list")
        self.detail_url = reverse("category-detail", kwargs={"slug": self.cat.slug})

    def test_public_list_is_accessible(self):
        res = self.client.get(self.list_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_public_retrieve_is_accessible(self):
        res = self.client.get(self.detail_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["slug"], self.cat.slug)

    def test_non_admin_cannot_create(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post(
            self.list_url,
            {"name": "Smart Home", "slug": "smart-home", "is_active": True},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_and_slug_autogenerates(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post(
            self.list_url,
            {"name": "Smart Home", "slug": "", "is_active": True},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["slug"], "smart-home")
        self.assertTrue(Category.objects.filter(slug="smart-home").exists())

    def test_admin_cannot_create_duplicate_slug(self):
        Category.objects.create(slug="dup", name="Dup", is_active=True)
        self.client.force_authenticate(user=self.admin)
        res = self.client.post(
            self.list_url,
            {"name": "Another", "slug": "dup", "is_active": True},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("slug", res.data)

    def test_admin_patch_blank_slug_regenerates(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.patch(
            self.detail_url,
            {"name": "New Name", "slug": ""},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.cat.refresh_from_db()
        self.assertEqual(self.cat.slug, "new-name")

    def test_admin_can_delete(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.delete(self.detail_url)
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Category.objects.filter(pk=self.cat.pk).exists())