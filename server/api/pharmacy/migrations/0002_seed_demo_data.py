from decimal import Decimal

from django.db import migrations


def seed_demo_data(apps, schema_editor):
    StaffUser = apps.get_model("pharmacy", "StaffUser")
    ActivityRecord = apps.get_model("pharmacy", "ActivityRecord")
    Medicine = apps.get_model("pharmacy", "Medicine")

    staff_users = [
        {
            "name": "Alice Mboya",
            "email": "alice@mameron.local",
            "password": "password123",
            "role": "Admin",
            "status": "Active",
            "last_active": "2 minutes ago",
        },
        {
            "name": "Brian Kato",
            "email": "brian@mameron.local",
            "password": "password123",
            "role": "Pharmacist",
            "status": "Active",
            "last_active": "14 minutes ago",
        },
        {
            "name": "Chantal Amina",
            "email": "chantal@mameron.local",
            "password": "password123",
            "role": "Cashier",
            "status": "Active",
            "last_active": "Today, 09:12",
        },
        {
            "name": "David Ouma",
            "email": "david@mameron.local",
            "password": "password123",
            "role": "Support",
            "status": "Active",
            "last_active": "Yesterday, 16:48",
        },
        {
            "name": "Evelyn Sifa",
            "email": "evelyn@mameron.local",
            "password": "password123",
            "role": "Support",
            "status": "Pending",
            "last_active": "Today, 08:03",
        },
        {
            "name": "Frank Njoroge",
            "email": "frank@mameron.local",
            "password": "password123",
            "role": "Cashier",
            "status": "Suspended",
            "last_active": "Yesterday, 11:24 PM",
        },
    ]

    for payload in staff_users:
        StaffUser.objects.update_or_create(email=payload["email"], defaults=payload)

    activities = [
        {
            "actor": "Alice Mboya",
            "action": "Changed user permissions for Brian Kato",
            "area": "Access Control",
            "severity": "High",
            "time": "5 minutes ago",
            "reviewed": False,
        },
        {
            "actor": "Brian Kato",
            "action": "Approved 14 pending prescriptions",
            "area": "Orders",
            "severity": "Medium",
            "time": "18 minutes ago",
            "reviewed": True,
        },
        {
            "actor": "System",
            "action": "Nightly backup completed successfully",
            "area": "Infrastructure",
            "severity": "Low",
            "time": "01:00 AM",
            "reviewed": True,
        },
        {
            "actor": "Security Watcher",
            "action": "Blocked suspicious login attempt from new device",
            "area": "Authentication",
            "severity": "High",
            "time": "Yesterday, 11:24 PM",
            "reviewed": False,
        },
    ]

    for payload in activities:
        ActivityRecord.objects.update_or_create(
            actor=payload["actor"],
            action=payload["action"],
            defaults=payload,
        )

    medicines = [
        {
            "name": "Amoxicillin 500mg",
            "purchase_price": Decimal("12.50"),
            "selling_price": Decimal("18.00"),
            "quantity": 60,
            "expiry_date": "2027-02-20",
        },
        {
            "name": "Paracetamol 500mg",
            "purchase_price": Decimal("4.20"),
            "selling_price": Decimal("7.50"),
            "quantity": 220,
            "expiry_date": "2026-10-15",
        },
        {
            "name": "Cough Syrup",
            "purchase_price": Decimal("6.80"),
            "selling_price": Decimal("11.00"),
            "quantity": 35,
            "expiry_date": "2026-08-05",
        },
    ]

    for payload in medicines:
        Medicine.objects.update_or_create(name=payload["name"], defaults=payload)


def remove_demo_data(apps, schema_editor):
    StaffUser = apps.get_model("pharmacy", "StaffUser")
    ActivityRecord = apps.get_model("pharmacy", "ActivityRecord")
    Medicine = apps.get_model("pharmacy", "Medicine")

    StaffUser.objects.filter(
        email__in=[
            "alice@mameron.local",
            "brian@mameron.local",
            "chantal@mameron.local",
            "david@mameron.local",
            "evelyn@mameron.local",
            "frank@mameron.local",
        ]
    ).delete()
    ActivityRecord.objects.filter(
        actor__in=["Alice Mboya", "Brian Kato", "System", "Security Watcher"]
    ).delete()
    Medicine.objects.filter(
        name__in=["Amoxicillin 500mg", "Paracetamol 500mg", "Cough Syrup"]
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("pharmacy", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_demo_data, remove_demo_data),
    ]
