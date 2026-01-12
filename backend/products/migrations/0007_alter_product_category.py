# Migration to alter Product.category from CharField to ForeignKey

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0006_create_category_model'),
    ]

    operations = [
        migrations.AlterField(
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
    ]
