from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0004_remove_order_shipping_address_and_more"),
    ]

    operations = [
        # No-op: discount_percentage was already added in 0004.
        # Keeping this migration to preserve history/dependencies.
    ]