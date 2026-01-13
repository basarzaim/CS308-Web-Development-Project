# Migration to alter Product.category from CharField to ForeignKey
# This migration preserves existing category data

from django.db import migrations, models
import django.db.models.deletion


def preserve_category_data(apps, schema_editor):
    """Copy existing category string values to temporary field."""
    # This function runs after category_temp is added
    # We'll use raw SQL to copy the data
    from django.db import connection
    with connection.cursor() as cursor:
        cursor.execute("""
            UPDATE products_product 
            SET category_temp = category 
            WHERE category IS NOT NULL AND category != ''
        """)


def migrate_to_foreign_key(apps, schema_editor):
    """Create Category objects and link products based on category_temp values."""
    Category = apps.get_model('products', 'Category')
    Product = apps.get_model('products', 'Product')
    
    # Old category choices - mapping from slug to name
    old_categories = {
        "phones": "Phones",
        "laptops": "Laptops & Ultrabooks",
        "tablets": "Tablets & E-Readers",
        "desktops": "Desktops & All-in-Ones",
        "monitors": "Monitors",
        "components": "PC Components",
        "peripherals": "Keyboards, Mice & Input",
        "networking": "Networking & Modems",
        "audio": "Headphones & Speakers",
        "tv_video": "TV & Video",
        "gaming": "Gaming Consoles & Accessories",
        "smart_home": "Smart Home",
        "wearables": "Wearables",
        "storage": "External Storage & SSD/HDD",
        "printers": "Printers & Scanners",
        "accessories": "Cables & Accessories",
        "drones": "Drones",
        "photo_video": "Cameras & Photo",
    }
    
    # Create Category objects
    category_map = {}
    for slug, name in old_categories.items():
        category, created = Category.objects.get_or_create(
            slug=slug,
            defaults={
                'name': name,
                'description': f"Category for {name.lower()}"
            }
        )
        category_map[slug] = category
    
    # Link products to Category objects using raw SQL
    from django.db import connection
    with connection.cursor() as cursor:
        for slug, category in category_map.items():
            cursor.execute("""
                UPDATE products_product 
                SET category_id = %s 
                WHERE category_temp = %s
            """, [category.id, slug])


def reverse_migration(apps, schema_editor):
    """Reverse: convert Category objects back to strings."""
    Product = apps.get_model('products', 'Product')
    from django.db import connection
    with connection.cursor() as cursor:
        cursor.execute("""
            UPDATE products_product 
            SET category_temp = (
                SELECT slug FROM products_category 
                WHERE products_category.id = products_product.category_id
            )
            WHERE category_id IS NOT NULL
        """)


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0006_create_category_model'),
    ]

    operations = [
        # Step 1: Add temporary field to preserve old category string values
        migrations.AddField(
            model_name='product',
            name='category_temp',
            field=models.CharField(max_length=50, null=True, blank=True),
        ),
        # Step 2: Copy existing category values to temporary field
        migrations.RunPython(
            preserve_category_data,
            reverse_code=migrations.RunPython.noop
        ),
        # Step 3: Remove old category CharField
        migrations.RemoveField(
            model_name='product',
            name='category',
        ),
        # Step 4: Add new ForeignKey field (initially null)
        migrations.AddField(
            model_name='product',
            name='category',
            field=models.ForeignKey(
                blank=True,
                db_index=True,
                help_text='Main category of the product',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                to='products.category',
            ),
        ),
        # Step 5: Migrate data from category_temp to category (ForeignKey)
        migrations.RunPython(
            migrate_to_foreign_key,
            reverse_code=reverse_migration
        ),
        # Step 6: Remove temporary field
        migrations.RemoveField(
            model_name='product',
            name='category_temp',
        ),
    ]
