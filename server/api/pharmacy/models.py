from django.db import models


class Staff_User(models.Model):
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


class Activity_Record(models.Model):
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


class Medicine_Product(models.Model):
    name = models.CharField(max_length=120)
    purchase_price = models.DecimalField(max_digits=10, decimal_places=2)
    selling_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField()
    expiry_date = models.DateField()

    class Meta:
        ordering = ["id"]


class Medicine_Item(models.Model):
    name = models.CharField(max_length=120, unique=True)

    class Meta:
        ordering = ["id"]


class Stock_Record(models.Model):
    medicine_item = models.OneToOneField(
        Medicine_Item,
        on_delete=models.CASCADE,
        related_name="stock_record",
    )
    total_items = models.PositiveIntegerField(default=0)
    stock_balance = models.PositiveIntegerField(default=0)
    expiry_date = models.DateField()

    class Meta:
        ordering = ["id"]


class Order_Record(models.Model):
    STATUS_PENDING = "Pending"
    STATUS_APPROVED = "Approved"
    STATUS_IN_TRANSIT = "In Transit"
    STATUS_DELIVERED = "Delivered"
    STATUS_ISSUE = "Issue"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_APPROVED, "Approved"),
        (STATUS_IN_TRANSIT, "In Transit"),
        (STATUS_DELIVERED, "Delivered"),
        (STATUS_ISSUE, "Issue"),
    ]

    PRIORITY_HIGH = "High"
    PRIORITY_MEDIUM = "Medium"
    PRIORITY_LOW = "Low"
    PRIORITY_CHOICES = [
        (PRIORITY_HIGH, "High"),
        (PRIORITY_MEDIUM, "Medium"),
        (PRIORITY_LOW, "Low"),
    ]

    customer_name = models.CharField(max_length=120)
    prescription_code = models.CharField(max_length=32, unique=True)
    medicine_name = models.CharField(max_length=120)
    quantity = models.PositiveIntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default=PRIORITY_MEDIUM)
    assigned_to = models.CharField(max_length=120)
    created_at_label = models.CharField(max_length=64)

    class Meta:
        ordering = ["id"]


class Sale_Record(models.Model):
    PAYMENT_CASH = "Cash"
    PAYMENT_CARD = "Card"
    PAYMENT_MOBILE = "Mobile"
    PAYMENT_INSURANCE = "Insurance"
    PAYMENT_CHOICES = [
        (PAYMENT_CASH, "Cash"),
        (PAYMENT_CARD, "Card"),
        (PAYMENT_MOBILE, "Mobile"),
        (PAYMENT_INSURANCE, "Insurance"),
    ]

    STATUS_COMPLETED = "Completed"
    STATUS_PENDING = "Pending"
    STATUS_REFUNDED = "Refunded"
    STATUS_CHOICES = [
        (STATUS_COMPLETED, "Completed"),
        (STATUS_PENDING, "Pending"),
        (STATUS_REFUNDED, "Refunded"),
    ]

    customer_name = models.CharField(max_length=120)
    invoice_code = models.CharField(max_length=32, unique=True)
    medicine_name = models.CharField(max_length=120)
    units = models.PositiveIntegerField()
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_COMPLETED)
    cashier_name = models.CharField(max_length=120)
    sold_at_label = models.CharField(max_length=64)

    class Meta:
        ordering = ["id"]
