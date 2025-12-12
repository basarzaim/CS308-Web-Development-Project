"""
Export products to JSON file for sharing with team members.

Usage:
    python manage.py export_products
    python manage.py export_products --output products_backup.json
"""
from django.core.management.base import BaseCommand
from products.models import Product
import json


class Command(BaseCommand):
    help = 'Export all products to JSON file'

    def add_arguments(self, parser):
        parser.add_argument(
            '--output',
            type=str,
            default='products_export.json',
            help='Output JSON file name (default: products_export.json)'
        )

    def handle(self, *args, **options):
        output_file = options['output']

        # Get all products
        products = Product.objects.all()

        if not products.exists():
            self.stdout.write(self.style.WARNING('No products found in database!'))
            return

        # Convert to list of dictionaries
        products_data = []
        for product in products:
            products_data.append({
                'name': product.name,
                'description': product.description,
                'price': str(product.price),
                'stock': product.stock,
                'warranty': product.warranty,
                'category': product.category,
                'image': product.image.url if product.image else None,
                'model': product.model,
                'serial_number': product.serial_number,
                'distributor': product.distributor,
            })

        # Write to JSON file
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(products_data, f, indent=2, ensure_ascii=False)

        self.stdout.write(
            self.style.SUCCESS(f'Successfully exported {len(products_data)} products to {output_file}')
        )
