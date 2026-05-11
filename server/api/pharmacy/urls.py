from django.urls import path

from .views import (
    activity_update_view,
    dashboard_view,
    login_view,
    medicine_detail_view,
    medicines_view,
    staff_user_update_view,
)

urlpatterns = [
    path("login/", login_view, name="login"),
    path("dashboard/", dashboard_view, name="dashboard"),
    path("users/<int:user_id>/", staff_user_update_view, name="user-update"),
    path("activities/<int:activity_id>/", activity_update_view, name="activity-update"),
    path("medicines/", medicines_view, name="medicines"),
    path("medicines/<int:medicine_id>/", medicine_detail_view, name="medicine-detail"),
]
