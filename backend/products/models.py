from django.db import models

class Product(models.Model):
    CATEGORY_CHOICES = [
        ("phones", "Phones"),
        ("laptops", "Laptops & Ultrabooks"),
        ("tablets", "Tablets & E-Readers"),
        ("desktops", "Desktops & All-in-Ones"),
        ("monitors", "Monitors"),
        ("components", "PC Components"),                  # GPU, CPU, RAM, vb.
        ("peripherals", "Keyboards, Mice & Input"),      # mouse, klavye vs
        ("networking", "Networking & Modems"),           # modem, router
        ("audio", "Headphones & Speakers"),
        ("tv_video", "TV & Video"),                      # TV, projeksiyon
        ("gaming", "Gaming Consoles & Accessories"),
        ("smart_home", "Smart Home"),                    # akıllı ampul, priz
        ("wearables", "Wearables"),                      # akıllı saat, bileklik
        ("storage", "External Storage & SSD/HDD"),
        ("printers", "Printers & Scanners"),
        ("accessories", "Cables & Accessories"),
        ("drones", "Drones"),
        ("photo_video", "Cameras & Photo"),
    ]


    name = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.PositiveIntegerField(default=0)
    warranty = models.IntegerField(default=0, help_text="Guarentee time (month)")
    image = models.ImageField(upload_to='products/', blank=True, null=True)

    description = models.TextField(blank=True, null=True)

    category = models.CharField(
        max_length=50,
        choices=CATEGORY_CHOICES,
        blank=True,
        null=True,
        help_text="Main category of the product (e.g. phones, laptops, audio)",
        db_index=True,  # Index for filtering by category
    )

    class Meta:
        indexes = [
            models.Index(fields=['category']),
            models.Index(fields=['price']),
            models.Index(fields=['stock']),
            models.Index(fields=['name']),  # For search
        ]

    def __str__(self):
        return self.name