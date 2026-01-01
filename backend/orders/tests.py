# backend/orders/tests.py
from django.test import TransactionTestCase
from django.contrib.auth import get_user_model
from django.db import close_old_connections
from threading import Thread, Barrier
from rest_framework.test import APIClient
from unittest.mock import patch

from products.models import Product
from orders.models import Order


class CheckoutConcurrencyTest(TransactionTestCase):
    # TransactionTestCase => gerçek transaction + concurrency için doğru sınıf
    reset_sequences = True

    def setUp(self):
        User = get_user_model()
        # create_user imzanız farklıysa burada patlayabilir:
        # o durumda buraya hata mesajını at, signature'a göre düzeltirim.
        self.user = User.objects.create_user(
            username="concurrency_user",
            email="concurrency_user@example.com",
            password="pass12345"
        )

        self.product = Product.objects.create(
            name="Test Product",
            price="10.00",
            stock=1,
            warranty=12
        )

        self.url = "/api/orders/checkout/"

    def _post_checkout(self, barrier, results, idx):
        close_old_connections()  # thread başına ayrı DB connection
        client = APIClient()
        client.force_authenticate(user=self.user)

        payload = {
            "items": [{"product_id": self.product.id, "quantity": 1}],
            "shipping": {"name": "X", "address": "Y", "city": "Z", "phone": "000"}
        }

        barrier.wait()  # iki thread aynı anda başlasın
        r = client.post(self.url, payload, format="json")
        results[idx] = r.status_code

    @patch("orders.views.send_order_confirmation_email", autospec=True)
    def test_race_condition_on_stock(self, _mock_email):
        """
        Eğer kilit yoksa: 2 paralel checkout -> bazen 2 order oluşur / stok negatif olur.
        Fix sonrası: 1 success, 1 fail; stok 0; order sayısı 1.
        """
        barrier = Barrier(2)
        results = [None, None]

        t1 = Thread(target=self._post_checkout, args=(barrier, results, 0))
        t2 = Thread(target=self._post_checkout, args=(barrier, results, 1))

        t1.start(); t2.start()
        t1.join(); t2.join()

        # FIX sonrası beklenti: 1 tane 201, 1 tane 409/400
        self.product.refresh_from_db()

        self.assertEqual(self.product.stock, 0, f"Stock should be 0, got {self.product.stock}")
        self.assertEqual(Order.objects.count(), 1, f"Only 1 order should be created, got {Order.objects.count()}")

        self.assertIn(201, results, f"Expected one 201, got {results}")
        self.assertTrue(
            any(code in (400, 409) for code in results),
            f"Expected one 400/409, got {results}"
        )