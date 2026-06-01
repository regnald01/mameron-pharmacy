from django.urls import path

from .views import (
    activity_update_view,
    create_order_view,
    create_sale_view,
    dashboard_view,
    login_view,
    medicine_detail_view,
    medicine_item_detail_view,
    medicine_items_view,
    medicines_view,
    order_detail_view,
    orders_view,
    sale_detail_view,
    sales_view,
    stock_records_view,
    staff_users_view,
    staff_user_update_view,
)

urlpatterns = [
    path("login/", login_view, name="login"),
    path("dashboard/", dashboard_view, name="dashboard"),
    path("users/", staff_users_view, name="users"),
    path("users/<int:user_id>/", staff_user_update_view, name="user-update"),
    path("activities/<int:activity_id>/", activity_update_view, name="activity-update"),
    path("items/", medicine_items_view, name="items"),
    path("items/<int:item_id>/", medicine_item_detail_view, name="item-detail"),
    path("medicines/", medicines_view, name="medicines"),
    path("medicines/<int:medicine_id>/", medicine_detail_view, name="medicine-detail"),
    path("stock/", stock_records_view, name="stock"),
    path("orders/", orders_view, name="orders"),
    path("orders/create/", create_order_view, name="order-create"),
    path("orders/<int:order_id>/", order_detail_view, name="order-detail"),
    path("sales/", sales_view, name="sales"),
    path("sales/create/", create_sale_view, name="sale-create"),
    path("sales/<int:sale_id>/", sale_detail_view, name="sale-detail"),
]
