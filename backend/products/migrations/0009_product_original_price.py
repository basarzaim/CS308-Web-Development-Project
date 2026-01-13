# Generated manually for adding original_price field
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0008_populate_categories'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='original_price',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text='Original price before discount. If null, price is the original price.',
                max_digits=10,
                null=True
            ),
        ),
    ]
