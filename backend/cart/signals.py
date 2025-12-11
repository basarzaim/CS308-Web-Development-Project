# cart/signals.py
from django.dispatch import receiver
from django.contrib.auth.signals import user_logged_in
from django.db import transaction

from products.models import Product
from .models import CartItem
from .utils import get_session_cart, clear_session_cart

@receiver(user_logged_in)
def merge_session_cart_into_user_cart(sender, user, request, **kwargs):
    """
    Anonim (oturumsuz) sepeti, kullanıcı login olduğunda DB tarafındaki sepete merge eder.
    Merge sonrası session sepetini temizler.
    """
    session_cart = get_session_cart(request)   # {"1": 2, "5": 1} gibi
    if not session_cart:
        return

    with transaction.atomic():
        for pid_str, qty in session_cart.items():
            try:
                product = Product.objects.get(pk=int(pid_str))
            except Product.DoesNotExist:
                continue

            item, _ = CartItem.objects.get_or_create(
                user=user, product=product, defaults={"quantity": 0}
            )
            item.quantity += int(qty)
            item.save()

    clear_session_cart(request)
