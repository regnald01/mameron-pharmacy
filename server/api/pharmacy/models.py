from django.db import models


class StaffUser(models.Model):
    ROLE_ADMIN = "Admin"
    ROLE_PHARMACIST = "Pharmacist"
    ROLE_CASHIER = "Cashier"
    ROLE_SUPPORT = "Support"
    ROLE_CHOICES = [
        (ROLE_ADMIN, "Admin"),
        (ROLE_PHARMACIST, "Pharmacist"),
        (ROLE_CASHIER, "Cashier"),
        (ROLE_SUPPORT, "Support"),
    ]

    STATUS_ACTIVE = "Active"
    STATUS_SUSPENDED = "Suspended"
    STATUS_PENDING = "Pending"
    STATUS_CHOICES = [
        (STATUS_ACTIVE, "Active"),
        (STATUS_SUSPENDED, "Suspended"),
        (STATUS_PENDING, "Pending"),
    ]

    name = models.CharField(max_length=120)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=128)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    last_active = models.CharField(max_length=64)

    class Meta:
        ordering = ["id"]

    def __str__(self) -> str:
        return self.email


class ActivityRecord(models.Model):
    SEVERITY_HIGH = "High"
    SEVERITY_MEDIUM = "Medium"
    SEVERITY_LOW = "Low"
    SEVERITY_CHOICES = [
        (SEVERITY_HIGH, "High"),
        (SEVERITY_MEDIUM, "Medium"),
        (SEVERITY_LOW, "Low"),
    ]

    actor = models.CharField(max_length=120)
    action = models.CharField(max_length=255)
    area = models.CharField(max_length=120)
    severity = models.CharField(max_length=16, choices=SEVERITY_CHOICES)
    time = models.CharField(max_length=64)
    reviewed = models.BooleanField(default=False)

    class Meta:
        ordering = ["id"]


class Medicine(models.Model):
    name = models.CharField(max_length=120)
    purchase_price = models.DecimalField(max_digits=10, decimal_places=2)
    selling_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField()
    expiry_date = models.DateField()

    class Meta:
        ordering = ["id"]

