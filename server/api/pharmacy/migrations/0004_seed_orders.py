from django.db import migrations


def seed_orders(apps, schema_editor):
    OrderRecord = apps.get_model("pharmacy", "OrderRecord")

    orders = [
        {
            "customer_name": "Naomi Wambui",
            "prescription_code": "RX-2401",
            "medicine_name": "Amoxicillin 500mg",
            "quantity": 2,
            "status": "Pending",
            "priority": "High",
            "assigned_to": "Support Desk",
            "created_at_label": "8 minutes ago",
        },
        {
            "customer_name": "James Otieno",
            "prescription_code": "RX-2402",
            "medicine_name": "Paracetamol 500mg",
            "quantity": 1,
            "status": "Approved",
            "priority": "Medium",
            "assigned_to": "Pharmacy Counter",
            "created_at_label": "21 minutes ago",
        },
        {
            "customer_name": "Lilian Auma",
            "prescription_code": "RX-2403",
            "medicine_name": "Cough Syrup",
            "quantity": 3,
            "status": "In Transit",
            "priority": "Low",
            "assigned_to": "Delivery Rider",
            "created_at_label": "Today, 09:18",
        },
        {
            "customer_name": "Peter Mwangi",
            "prescription_code": "RX-2404",
            "medicine_name": "Vitamin C Tablets",
            "quantity": 2,
            "status": "Issue",
            "priority": "High",
            "assigned_to": "Support Lead",
            "created_at_label": "Today, 10:42",
        },
        {
            "customer_name": "Grace Njeri",
            "prescription_code": "RX-2405",
            "medicine_name": "Amoxicillin 500mg",
            "quantity": 1,
            "status": "Delivered",
            "priority": "Medium",
            "assigned_to": "Pickup Desk",
            "created_at_label": "Yesterday, 05:30 PM",
        },
    ]

    for payload in orders:
        OrderRecord.objects.update_or_create(
            prescription_code=payload["prescription_code"],
            defaults=payload,
        )


def remove_orders(apps, schema_editor):
    OrderRecord = apps.get_model("pharmacy", "OrderRecord")
    OrderRecord.objects.filter(
        prescription_code__in=["RX-2401", "RX-2402", "RX-2403", "RX-2404", "RX-2405"]
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("pharmacy", "0003_orderrecord"),
    ]

    operations = [
        migrations.RunPython(seed_orders, remove_orders),
    ]
