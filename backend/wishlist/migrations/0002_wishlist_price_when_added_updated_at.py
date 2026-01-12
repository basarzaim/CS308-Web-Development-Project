# Generated manually for discount tracking
from django.db import migrations, models


def populate_price_when_added(apps, schema_editor):
    """Populate price_when_added for existing wishlist items"""
    Wishlist = apps.get_model('wishlist', 'Wishlist')
    for wishlist_item in Wishlist.objects.all():
        if wishlist_item.price_when_added is None and wishlist_item.product:
            wishlist_item.price_when_added = wishlist_item.product.price
            wishlist_item.save(update_fields=['price_when_added'])


def reverse_populate_price_when_added(apps, schema_editor):
    """Reverse migration - no need to do anything"""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('wishlist', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='wishlist',
            name='price_when_added',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text='Price of the product when it was added to wishlist (for discount detection)',
                max_digits=10,
                null=True
            ),
        ),
        migrations.AddField(
            model_name='wishlist',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.RunPython(
            populate_price_when_added,
            reverse_populate_price_when_added
        ),
    ]
