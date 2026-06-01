from decimal import Decimal

from django.db import migrations


def seed_sales(apps, schema_editor):
    SaleRecord = apps.get_model("pharmacy", "SaleRecord")

    sales = [
        {
            "customer_name": "Mercy Akinyi",
            "invoice_code": "INV-3101",
            "medicine_name": "Paracetamol 500mg",
            "units": 2,
            "total_amount": Decimal("15.00"),
            "payment_method": "Cash",
            "status": "Completed",
            "cashier_name": "Cashier Desk",
            "sold_at_label": "7 minutes ago",
        },
        {
            "customer_name": "Samuel Kibet",
            "invoice_code": "INV-3102",
            "medicine_name": "Amoxicillin 500mg",
            "units": 1,
            "total_amount": Decimal("18.00"),
            "payment_method": "Card",
            "status": "Completed",
            "cashier_name": "Front Counter",
            "sold_at_label": "19 minutes ago",
        },
        {
            "customer_name": "Faith Wanjiru",
            "invoice_code": "INV-3103",
            "medicine_name": "Cough Syrup",
            "units": 3,
            "total_amount": Decimal("33.00"),
            "payment_method": "Mobile",
            "status": "Pending",
            "cashier_name": "Shift A",
            "sold_at_label": "Today, 10:12",
        },
        {
            "customer_name": "Daniel Oloo",
            "invoice_code": "INV-3104",
            "medicine_name": "Vitamin C Tablets",
            "units": 1,
            "total_amount": Decimal("9.50"),
            "payment_method": "Insurance",
            "status": "Refunded",
            "cashier_name": "Shift B",
            "sold_at_label": "Today, 11:04",
        },
    ]

    for payload in sales:
        SaleRecord.objects.update_or_create(
            invoice_code=payload["invoice_code"],
            defaults=payload,
        )


def remove_sales(apps, schema_editor):
    SaleRecord = apps.get_model("pharmacy", "SaleRecord")
    SaleRecord.objects.filter(
        invoice_code__in=["INV-3101", "INV-3102", "INV-3103", "INV-3104"]
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("pharmacy", "0005_salerecord"),
    ]

    operations = [
        migrations.RunPython(seed_sales, remove_sales),
    ]
