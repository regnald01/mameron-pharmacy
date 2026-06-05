from django.contrib import admin

from .models import Activity_Record, Medicine_Product, Medicine_Item, Order_Record, Sale_Record, Staff_User, Stock_Record


@admin.register(Staff_User)
class StaffUserAdmin(admin.ModelAdmin):
    list_display = ("name", "email", "role", "status", "last_active")
    list_filter = ("role", "status")
    search_fields = ("name", "email")


@admin.register(Activity_Record)
class ActivityRecordAdmin(admin.ModelAdmin):
    list_display = ("actor", "area", "severity", "time", "reviewed")
    list_filter = ("severity", "reviewed")
    search_fields = ("actor", "action", "area")


@admin.register(Medicine_Product)
class MedicineAdmin(admin.ModelAdmin):
    list_display = ("name", "purchase_price", "selling_price", "quantity", "expiry_date")
    search_fields = ("name",)


@admin.register(Medicine_Item)
class MedicineItemAdmin(admin.ModelAdmin):
    list_display = ("name",)
    search_fields = ("name",)


@admin.register(Stock_Record)
class StockRecordAdmin(admin.ModelAdmin):
    list_display = ("medicine_item", "total_items", "stock_balance", "expiry_date")
    search_fields = ("medicine_item__name",)


@admin.register(Order_Record)
class OrderRecordAdmin(admin.ModelAdmin):
    list_display = ("medicine_name", "quantity", "priority", "created_at_label", "status")
    list_filter = ("status",)
    search_fields = ("medicine_name",)


@admin.register(Sale_Record)
class SaleRecordAdmin(admin.ModelAdmin):
    list_display = ("medicine_name", "units", "total_amount", "sold_at_label", "status")
    list_filter = ("status",)
    search_fields = ("medicine_name",)
