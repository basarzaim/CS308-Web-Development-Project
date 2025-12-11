from django.apps import AppConfig

class CartConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "cart"

    def ready(self):
        # Signal'leri app start'ta yükle
        from . import signals  # noqa
