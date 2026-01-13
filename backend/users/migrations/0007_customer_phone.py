# Generated manually for adding phone field
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0006_customer_taxid_home_address'),
    ]

    operations = [
        migrations.AddField(
            model_name='customer',
            name='phone',
            field=models.CharField(
                blank=True,
                help_text='Customer phone number',
                max_length=20,
                null=True
            ),
        ),
    ]
