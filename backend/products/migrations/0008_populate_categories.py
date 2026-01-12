# Data migration to populate categories and update existing products

from django.db import migrations


def populate_categories(apps, schema_editor):
    """Create Category objects and link existing products to them."""
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
    category_objects = {}
    for slug, name in old_categories.items():
        category = Category.objects.create(
            name=name,
            slug=slug,
            description=f"Category for {name.lower()}"
        )
        category_objects[slug] = category
        print(f"Created category: {name} ({slug})")

    # Update existing products to reference Category objects
    # Since we cleared the category field in migration 0007, we need to restore the data
    # But we don't have the original category data anymore since it was cleared
    # So we'll just create the categories and leave products without categories for now
    print("Categories created successfully. Products will need to be recategorized manually.")


def reverse_populate_categories(apps, schema_editor):
    """Reverse migration - delete all categories."""
    Category = apps.get_model('products', 'Category')

    # Delete all categories
    Category.objects.all().delete()


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
