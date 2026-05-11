import json
from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Any

from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods

from .models import ActivityRecord, Medicine, StaffUser


def _json_body(request: HttpRequest) -> dict[str, Any]:
    if not request.body:
        return {}
    return json.loads(request.body.decode("utf-8"))


def _staff_user_payload(user: StaffUser) -> dict[str, Any]:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "status": user.status,
        "lastActive": user.last_active,
    }


def _activity_payload(activity: ActivityRecord) -> dict[str, Any]:
    return {
        "id": activity.id,
        "actor": activity.actor,
        "action": activity.action,
        "area": activity.area,
        "severity": activity.severity,
        "time": activity.time,
        "reviewed": activity.reviewed,
    }


def _medicine_payload(medicine: Medicine) -> dict[str, Any]:
    return {
        "id": medicine.id,
        "name": medicine.name,
        "purchasePrice": f"{medicine.purchase_price:.2f}",
        "sellingPrice": f"{medicine.selling_price:.2f}",
        "quantity": str(medicine.quantity),
        "expiryDate": medicine.expiry_date.isoformat(),
    }


@csrf_exempt
@require_http_methods(["POST"])
def login_view(request: HttpRequest) -> JsonResponse:
    payload = _json_body(request)
    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", "")).strip()
    role = str(payload.get("role", "")).strip()

    if not email or not password or not role:
        return JsonResponse({"detail": "Email, password, and role are required."}, status=400)

    try:
        user = StaffUser.objects.get(email=email, role=role)
    except StaffUser.DoesNotExist:
        return JsonResponse({"detail": "Invalid login details."}, status=401)

    if user.password != password:
        return JsonResponse({"detail": "Invalid login details."}, status=401)

    if user.status != StaffUser.STATUS_ACTIVE:
        return JsonResponse({"detail": f"{user.status} accounts cannot sign in."}, status=403)

    return JsonResponse(
        {
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
            }
        }
    )


@require_GET
def dashboard_view(request: HttpRequest) -> JsonResponse:
    role = request.GET.get("role", "")

    if role == StaffUser.ROLE_ADMIN:
        users = list(StaffUser.objects.all())
        activities = list(ActivityRecord.objects.all())
        unresolved_activities = sum(1 for activity in activities if not activity.reviewed)
        active_users = sum(1 for user in users if user.status == StaffUser.STATUS_ACTIVE)
        pending_users = sum(1 for user in users if user.status == StaffUser.STATUS_PENDING)

        return JsonResponse(
            {
                "users": [_staff_user_payload(user) for user in users],
                "activities": [_activity_payload(activity) for activity in activities],
                "stats": [
                    {
                        "label": "Total users",
                        "value": str(len(users)),
                        "description": f"{active_users} currently active in the workspace",
                    },
                    {
                        "label": "Pending approvals",
                        "value": str(pending_users),
                        "description": "Accounts waiting for activation or review",
                    },
                    {
                        "label": "Open alerts",
                        "value": str(unresolved_activities),
                        "description": "Activity items still waiting for an admin check",
                    },
                    {
                        "label": "Audit coverage",
                        "value": "98%",
                        "description": "Recent system actions captured in the log feed",
                    },
                ],
            }
        )

    role_dashboards = {
        StaffUser.ROLE_PHARMACIST: {
            "stats": [
                {"label": "Prescriptions queue", "value": "18", "description": "Items waiting for pharmacist review"},
                {"label": "Low stock medicines", "value": "7", "description": "Products that need restocking soon"},
                {"label": "Expiring this month", "value": "4", "description": "Medicines needing priority rotation"},
                {"label": "Today's approvals", "value": "26", "description": "Prescriptions approved by your team"},
            ],
            "highlights": [
                {
                    "title": "Monitor medicine availability",
                    "text": "Check low stock, expiring products, and item movement before shortages affect patients.",
                },
                {
                    "title": "Prepare prescription workflows",
                    "text": "See pending approvals, refill requests, and pharmacist-owned actions from one dashboard.",
                },
            ],
        },
        StaffUser.ROLE_CASHIER: {
            "stats": [
                {"label": "Today's sales", "value": "$4,820", "description": "Revenue processed in the current shift cycle"},
                {"label": "Transactions", "value": "126", "description": "Completed payments across all desks today"},
                {"label": "Average basket", "value": "$38", "description": "Average customer purchase amount"},
                {"label": "Refund requests", "value": "3", "description": "Cases waiting for review or approval"},
            ],
            "highlights": [
                {
                    "title": "Track live revenue",
                    "text": "Keep an eye on totals, completed transactions, and payment flow throughout the day.",
                },
                {
                    "title": "Handle desk exceptions",
                    "text": "Follow up on refunds, payment issues, and shift reconciliation without touching admin settings.",
                },
            ],
        },
        StaffUser.ROLE_SUPPORT: {
            "stats": [
                {"label": "Open order issues", "value": "11", "description": "Cases currently waiting for follow-up"},
                {"label": "Late deliveries", "value": "5", "description": "Orders that need customer communication"},
                {"label": "Resolved today", "value": "23", "description": "Support cases closed by the team"},
                {"label": "Response time", "value": "12m", "description": "Average first-response speed this morning"},
            ],
            "highlights": [
                {
                    "title": "Resolve order blockers",
                    "text": "Follow delayed orders, incomplete prescriptions, and delivery questions from one service queue.",
                },
                {
                    "title": "Keep customers updated",
                    "text": "Use the support dashboard to prioritize urgent requests and close the communication loop faster.",
                },
            ],
        },
    }

    data = role_dashboards.get(role)
    if data is None:
        return JsonResponse({"detail": "Unsupported role."}, status=400)

    return JsonResponse(data)


@csrf_exempt
@require_http_methods(["PATCH"])
def staff_user_update_view(request: HttpRequest, user_id: int) -> JsonResponse:
    payload = _json_body(request)

    try:
        user = StaffUser.objects.get(id=user_id)
    except StaffUser.DoesNotExist:
        return JsonResponse({"detail": "User not found."}, status=404)

    next_role = payload.get("role")
    next_status = payload.get("status")

    if next_role in dict(StaffUser.ROLE_CHOICES):
        user.role = next_role

    if next_status in dict(StaffUser.STATUS_CHOICES):
        user.status = next_status

    user.save()
    return JsonResponse({"user": _staff_user_payload(user)})


@csrf_exempt
@require_http_methods(["PATCH"])
def activity_update_view(request: HttpRequest, activity_id: int) -> JsonResponse:
    payload = _json_body(request)

    try:
        activity = ActivityRecord.objects.get(id=activity_id)
    except ActivityRecord.DoesNotExist:
        return JsonResponse({"detail": "Activity not found."}, status=404)

    if "reviewed" in payload:
        activity.reviewed = bool(payload["reviewed"])
        activity.save(update_fields=["reviewed"])

    return JsonResponse({"activity": _activity_payload(activity)})


@csrf_exempt
@require_http_methods(["GET", "POST"])
def medicines_view(request: HttpRequest) -> JsonResponse:
    if request.method == "GET":
        medicines = Medicine.objects.all()
        return JsonResponse({"medicines": [_medicine_payload(medicine) for medicine in medicines]})

    payload = _json_body(request)
    try:
        medicine = Medicine.objects.create(
            name=_parse_name(payload.get("name")),
            purchase_price=_parse_decimal(payload.get("purchasePrice")),
            selling_price=_parse_decimal(payload.get("sellingPrice")),
            quantity=_parse_int(payload.get("quantity")),
            expiry_date=_parse_date(payload.get("expiryDate")),
        )
    except ValueError as error:
        return JsonResponse({"detail": str(error)}, status=400)

    return JsonResponse({"medicine": _medicine_payload(medicine)}, status=201)


@csrf_exempt
@require_http_methods(["PUT", "DELETE"])
def medicine_detail_view(request: HttpRequest, medicine_id: int) -> JsonResponse:
    try:
        medicine = Medicine.objects.get(id=medicine_id)
    except Medicine.DoesNotExist:
        return JsonResponse({"detail": "Medicine not found."}, status=404)

    if request.method == "DELETE":
        medicine.delete()
        return JsonResponse({}, status=204)

    payload = _json_body(request)
    try:
        medicine.name = _parse_name(payload.get("name"))
        medicine.purchase_price = _parse_decimal(payload.get("purchasePrice"))
        medicine.selling_price = _parse_decimal(payload.get("sellingPrice"))
        medicine.quantity = _parse_int(payload.get("quantity"))
        medicine.expiry_date = _parse_date(payload.get("expiryDate"))
    except ValueError as error:
        return JsonResponse({"detail": str(error)}, status=400)

    medicine.save()
    return JsonResponse({"medicine": _medicine_payload(medicine)})


def _parse_decimal(raw_value: Any) -> Decimal:
    try:
        value = Decimal(str(raw_value))
    except (InvalidOperation, TypeError):
        raise ValueError("Prices must be valid numbers.")

    if value < 0:
        raise ValueError("Prices must be zero or greater.")

    return value


def _parse_name(raw_value: Any) -> str:
    value = str(raw_value or "").strip()
    if not value:
        raise ValueError("Medicine name is required.")
    return value


def _parse_date(raw_value: Any) -> date:
    try:
        return date.fromisoformat(str(raw_value))
    except (TypeError, ValueError):
        raise ValueError("Expiry date must be a valid date.")


def _parse_int(raw_value: Any) -> int:
    try:
        value = int(str(raw_value))
    except (ValueError, TypeError):
        raise ValueError("Quantity must be a valid integer.")

    if value < 0:
        raise ValueError("Quantity must be zero or greater.")

    return value
