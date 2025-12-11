# cart/utils.py

# Session içinde şu formatta tutacağız:
# request.session["cart"] = { "1": 2, "5": 1 }  # product_id -> quantity

from typing import Dict

SESSION_CART_KEY = "cart"

def get_session_cart(request) -> Dict[str, int]:
    """Session'daki sepet sözlüğünü döndürür; yoksa boş sözlük verir."""
    return request.session.get(SESSION_CART_KEY, {})

def add_to_session_cart(request, product_id: int, qty: int = 1):
    """Anonim kullanıcı için session sepetine ürün ekler/arttırır."""
    cart = get_session_cart(request)
    pid = str(product_id)
    cart[pid] = cart.get(pid, 0) + max(1, int(qty))
    request.session[SESSION_CART_KEY] = cart
    request.session.modified = True  # Django'ya session değişti de

def clear_session_cart(request):
    """Login sonrası session sepetini temizler."""
    if SESSION_CART_KEY in request.session:
        del request.session[SESSION_CART_KEY]
        request.session.modified = True
