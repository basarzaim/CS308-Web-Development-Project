# Generated manually for adding taxID and home_address fields
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0005_alter_customer_role'),
    ]

    operations = [
        migrations.AddField(
            model_name='customer',
            name='taxID',
            field=models.CharField(
                blank=True,
                help_text='Customer tax identification number',
                max_length=100,
                null=True
            ),
        ),
        migrations.AddField(
            model_name='customer',
            name='home_address',
            field=models.TextField(
                blank=True,
                help_text="Customer's home address",
                null=True
            ),
        ),
    ]
