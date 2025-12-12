"""
Import products from JSON file.

Usage:
    python manage.py import_products products_export.json
    python manage.py import_products products_export.json --clear
"""
from django.core.management.base import BaseCommand
from products.models import Product
import json


class Command(BaseCommand):
    help = 'Import products from JSON file'

    def add_arguments(self, parser):
        parser.add_argument(
            'json_file',
            type=str,
            help='JSON file containing products data'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing products before importing'
        )

    def handle(self, *args, **options):
        json_file = options['json_file']
        clear_existing = options['clear']

        # Read JSON file
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                products_data = json.load(f)
        except FileNotFoundError:
            self.stdout.write(self.style.ERROR(f'File not found: {json_file}'))
            return
        except json.JSONDecodeError:
            self.stdout.write(self.style.ERROR(f'Invalid JSON file: {json_file}'))
            return

        # Clear existing products if requested
        if clear_existing:
            count = Product.objects.count()
            Product.objects.all().delete()
            self.stdout.write(self.style.WARNING(f'Deleted {count} existing products'))

        # Import products
        created_count = 0
        for product_data in products_data:
            # Skip if product with same name already exists
            if Product.objects.filter(name=product_data['name']).exists():
                self.stdout.write(
                    self.style.WARNING(f'Skipping existing product: {product_data["name"]}')
                )
                continue

            # Create product (without image for now)
            Product.objects.create(
                name=product_data['name'],
                description=product_data.get('description', ''),
                price=product_data['price'],
                stock=product_data.get('stock', 0),
                warranty=product_data.get('warranty', 0),
                category=product_data.get('category', 'phones'),
                model=product_data.get('model', ''),
                serial_number=product_data.get('serial_number'),
                distributor=product_data.get('distributor', ''),
            )
            created_count += 1
            self.stdout.write(f'Created: {product_data["name"]}')

        self.stdout.write(
            self.style.SUCCESS(f'Successfully imported {created_count} products')
        )
