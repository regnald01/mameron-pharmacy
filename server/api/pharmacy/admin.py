from django.contrib import admin

from .models import ActivityRecord, Medicine, StaffUser


@admin.register(StaffUser)
class StaffUserAdmin(admin.ModelAdmin):
    list_display = ("name", "email", "role", "status", "last_active")
    list_filter = ("role", "status")
    search_fields = ("name", "email")


@admin.register(ActivityRecord)
class ActivityRecordAdmin(admin.ModelAdmin):
    list_display = ("actor", "area", "severity", "time", "reviewed")
    list_filter = ("severity", "reviewed")
    search_fields = ("actor", "action", "area")


@admin.register(Medicine)
class MedicineAdmin(admin.ModelAdmin):
    list_display = ("name", "purchase_price", "selling_price", "quantity", "expiry_date")
    search_fields = ("name",)

