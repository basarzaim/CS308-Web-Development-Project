# Data migration to populate categories and update existing products
# NOTE: This migration is now redundant as migration 0007 already handles category creation and product linking.
# This migration is kept for historical purposes but does nothing.

from django.db import migrations


def populate_categories(apps, schema_editor):
    """This function is a no-op since migration 0007 already created categories and linked products."""
    # Migration 0007 already:
    # 1. Created all Category objects
    # 2. Linked products to Category objects based on their old category string values
    # So this migration does nothing to avoid duplicate key errors
    pass


def reverse_populate_categories(apps, schema_editor):
    """Reverse migration - no-op since we didn't create anything here."""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0007_alter_product_category'),
    ]

    operations = [
        migrations.RunPython(
            populate_categories,
            reverse_code=reverse_populate_categories
        ),
    ]
