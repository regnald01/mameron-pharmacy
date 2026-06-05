import json
from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Any

from django.db import IntegrityError
from django.db import transaction
from django.http import HttpRequest, JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods

from .models import (
    Activity_Record as ActivityRecord,
    Medicine_Item as MedicineItem,
    Medicine_Product as Medicine,
    Order_Record as OrderRecord,
    Sale_Record as SaleRecord,
    Staff_User as StaffUser,
    Stock_Record as StockRecord,
)


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


def _medicine_item_payload(item: MedicineItem) -> dict[str, Any]:
    return {
        "id": item.id,
        "name": item.name,
    }


def _stock_payload(stock: StockRecord) -> dict[str, Any]:
    return {
        "id": stock.id,
        "medicineItemId": stock.medicine_item_id,
        "medicineName": stock.medicine_item.name,
        "totalItems": str(stock.total_items),
        "stockBalance": str(stock.stock_balance),
        "expiryDate": stock.expiry_date.isoformat(),
    }


def _sale_status_affects_stock(status: str) -> bool:
    return status == SaleRecord.STATUS_COMPLETED


@transaction.atomic
def _apply_stock_movement(
    medicine_item: MedicineItem,
    quantity: int,
    operation: str,
    expiry_date: date | None = None,
) -> tuple[StockRecord, bool]:
    stock, created = StockRecord.objects.select_for_update().get_or_create(
        medicine_item=medicine_item,
        defaults={
            "total_items": 0,
            "stock_balance": 0,
            "expiry_date": expiry_date or timezone.localdate(),
        },
    )

    if operation == "deduct":
        if created:
            stock.delete()
            raise ValueError("No stock record exists for this medicine item yet.")
        if quantity > stock.stock_balance:
            raise ValueError("Cannot deduct more than the current stock balance.")
        stock.stock_balance -= quantity
        stock.total_items = max(0, stock.total_items - quantity)
    else:
        stock.total_items += quantity
        stock.stock_balance += quantity

    if expiry_date is not None:
        stock.expiry_date = expiry_date

    stock.save()
    return stock, created and operation == "add"


@transaction.atomic
def _sync_medicine_stock(medicine: Medicine, previous_name: str | None = None) -> None:
    medicine_item = None
    if previous_name:
        medicine_item = MedicineItem.objects.filter(name=previous_name).first()

    if medicine_item is None:
        medicine_item, _ = MedicineItem.objects.get_or_create(name=medicine.name)
    elif medicine_item.name != medicine.name:
        existing_item = MedicineItem.objects.filter(name=medicine.name).first()
        if existing_item is None:
            medicine_item.name = medicine.name
            medicine_item.save(update_fields=["name"])
        else:
            medicine_item = existing_item

    stock, _ = StockRecord.objects.select_for_update().get_or_create(
        medicine_item=medicine_item,
        defaults={
            "total_items": medicine.quantity,
            "stock_balance": medicine.quantity,
            "expiry_date": medicine.expiry_date,
        },
    )
    stock.total_items = medicine.quantity
    stock.stock_balance = medicine.quantity
    stock.expiry_date = medicine.expiry_date
    stock.save()


def _find_medicine_item_for_sale(medicine_name: str) -> MedicineItem:
    try:
        return MedicineItem.objects.get(name=medicine_name)
    except MedicineItem.DoesNotExist as error:
        raise ValueError("No stock item exists for the selected medicine.") from error


def _apply_sale_stock_adjustment(sale: SaleRecord, operation: str) -> None:
    medicine_item = _find_medicine_item_for_sale(sale.medicine_name)
    _apply_stock_movement(medicine_item, sale.units, operation)


def _order_payload(order: OrderRecord) -> dict[str, Any]:
    return {
        "id": order.id,
        "customerName": order.customer_name,
        "prescriptionCode": order.prescription_code,
        "medicineName": order.medicine_name,
        "quantity": str(order.quantity),
        "status": order.status,
        "priority": order.priority,
        "assignedTo": order.assigned_to,
        "createdAtLabel": order.created_at_label,
    }


def _sale_payload(sale: SaleRecord) -> dict[str, Any]:
    return {
        "id": sale.id,
        "customerName": sale.customer_name,
        "invoiceCode": sale.invoice_code,
        "medicineName": sale.medicine_name,
        "units": str(sale.units),
        "totalAmount": f"{sale.total_amount:.2f}",
        "paymentMethod": sale.payment_method,
        "status": sale.status,
        "cashierName": sale.cashier_name,
        "soldAtLabel": sale.sold_at_label,
    }


def _timestamp_label() -> str:
    return timezone.localtime().strftime("%b %d, %I:%M %p")


def _actor_label(payload: dict[str, Any]) -> str:
    value = str(payload.get("actor", "")).strip()
    return value or "System"


def _log_activity(actor: str, action: str, area: str, severity: str) -> None:
    ActivityRecord.objects.create(
        actor=actor,
        action=action,
        area=area,
        severity=severity,
        time=_timestamp_label(),
        reviewed=False,
    )


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
@require_http_methods(["POST"])
def staff_users_view(request: HttpRequest) -> JsonResponse:
    payload = _json_body(request)
    actor = _actor_label(payload)

    email = str(payload.get("email", "")).strip().lower()
    if StaffUser.objects.filter(email=email).exists():
        return JsonResponse({"detail": "A user with this email already exists."}, status=400)

    try:
        user = StaffUser.objects.create(
            name=_parse_required_text(payload.get("name"), "User name is required."),
            email=email,
            password=_parse_required_text(payload.get("password"), "Password is required."),
            role=_parse_staff_role(payload.get("role")),
            status=_parse_staff_status(payload.get("status")),
            last_active=_parse_required_text(payload.get("lastActive"), "Last active label is required."),
        )
    except ValueError as error:
        return JsonResponse({"detail": str(error)}, status=400)

    _log_activity(
        actor,
        f"Created user account for {user.name} ({user.role})",
        "Access Control",
        ActivityRecord.SEVERITY_MEDIUM,
    )
    return JsonResponse({"user": _staff_user_payload(user)}, status=201)


@csrf_exempt
@require_http_methods(["PATCH", "DELETE"])
def staff_user_update_view(request: HttpRequest, user_id: int) -> JsonResponse:
    payload = _json_body(request)
    actor = _actor_label(payload)

    try:
        user = StaffUser.objects.get(id=user_id)
    except StaffUser.DoesNotExist:
        return JsonResponse({"detail": "User not found."}, status=404)

    if request.method == "DELETE":
        user_name = user.name
        user_role = user.role
        user.delete()
        _log_activity(
            actor,
            f"Deleted user account for {user_name} ({user_role})",
            "Access Control",
            ActivityRecord.SEVERITY_HIGH,
        )
        return JsonResponse({"detail": "User deleted successfully."}, status=200)

    next_name = payload.get("name")
    next_email = payload.get("email")
    next_password = payload.get("password")
    next_role = payload.get("role")
    next_status = payload.get("status")
    next_last_active = payload.get("lastActive")
    changes: list[str] = []

    try:
        if next_name is not None:
            parsed_name = _parse_required_text(next_name, "User name is required.")
            if parsed_name != user.name:
                changes.append(f"name from {user.name} to {parsed_name}")
                user.name = parsed_name

        if next_email is not None:
            parsed_email = _parse_required_text(next_email, "Email is required.").lower()
            if StaffUser.objects.filter(email=parsed_email).exclude(id=user.id).exists():
                return JsonResponse({"detail": "A user with this email already exists."}, status=400)
            if parsed_email != user.email:
                changes.append(f"email from {user.email} to {parsed_email}")
                user.email = parsed_email

        if next_password is not None:
            parsed_password = _parse_required_text(next_password, "Password is required.")
            if parsed_password != user.password:
                changes.append("password updated")
                user.password = parsed_password

        if next_last_active is not None:
            parsed_last_active = _parse_required_text(next_last_active, "Last active label is required.")
            if parsed_last_active != user.last_active:
                changes.append(f"last active from {user.last_active} to {parsed_last_active}")
                user.last_active = parsed_last_active
    except ValueError as error:
        return JsonResponse({"detail": str(error)}, status=400)

    if next_role in dict(StaffUser.ROLE_CHOICES) and next_role != user.role:
        changes.append(f"role from {user.role} to {next_role}")
        user.role = next_role

    if next_status in dict(StaffUser.STATUS_CHOICES) and next_status != user.status:
        changes.append(f"status from {user.status} to {next_status}")
        user.status = next_status

    user.save()
    if changes:
        _log_activity(
            actor,
            f"Updated {user.name}: " + ", ".join(changes),
            "Access Control",
            ActivityRecord.SEVERITY_HIGH if "role" in " ".join(changes) else ActivityRecord.SEVERITY_MEDIUM,
        )
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
    actor = _actor_label(payload)
    try:
        with transaction.atomic():
            medicine = Medicine.objects.create(
                name=_parse_name(payload.get("name")),
                purchase_price=_parse_decimal(payload.get("purchasePrice")),
                selling_price=_parse_decimal(payload.get("sellingPrice")),
                quantity=_parse_int(payload.get("quantity")),
                expiry_date=_parse_date(payload.get("expiryDate")),
            )
            _sync_medicine_stock(medicine)
    except ValueError as error:
        return JsonResponse({"detail": str(error)}, status=400)

    _log_activity(
        actor,
        f"Added medicine {medicine.name} with stock {medicine.quantity}",
        "Inventory",
        ActivityRecord.SEVERITY_MEDIUM,
    )
    return JsonResponse({"medicine": _medicine_payload(medicine)}, status=201)


@csrf_exempt
@require_http_methods(["GET", "POST"])
def medicine_items_view(request: HttpRequest) -> JsonResponse:
    if request.method == "GET":
        items = MedicineItem.objects.all()
        return JsonResponse({"items": [_medicine_item_payload(item) for item in items]})

    payload = _json_body(request)
    actor = _actor_label(payload)

    try:
        item = MedicineItem.objects.create(name=_parse_name(payload.get("name")))
    except ValueError as error:
        return JsonResponse({"detail": str(error)}, status=400)
    except IntegrityError:
        return JsonResponse({"detail": "An item with this medicine name already exists."}, status=400)

    _log_activity(
        actor,
        f"Added medicine item {item.name}",
        "Items",
        ActivityRecord.SEVERITY_MEDIUM,
    )
    return JsonResponse({"item": _medicine_item_payload(item)}, status=201)


@csrf_exempt
@require_http_methods(["GET", "POST"])
def stock_records_view(request: HttpRequest) -> JsonResponse:
    if request.method == "GET":
        stocks = StockRecord.objects.select_related("medicine_item").all()
        return JsonResponse({"stocks": [_stock_payload(stock) for stock in stocks]})

    payload = _json_body(request)
    actor = _actor_label(payload)

    try:
        medicine_item = MedicineItem.objects.get(
            id=_parse_positive_int(payload.get("medicineItemId"), "Medicine item is required.")
        )
    except MedicineItem.DoesNotExist:
        return JsonResponse({"detail": "Medicine item not found."}, status=404)
    except ValueError as error:
        return JsonResponse({"detail": str(error)}, status=400)

    try:
        quantity = _parse_positive_int(payload.get("quantity"), "Quantity is required.")
        operation = _parse_stock_operation(payload.get("operation"))
        expiry_date = _parse_optional_date(payload.get("expiryDate"))
    except ValueError as error:
        return JsonResponse({"detail": str(error)}, status=400)

    try:
        stock, created = _apply_stock_movement(
            medicine_item,
            quantity,
            operation,
            expiry_date,
        )
    except ValueError as error:
        return JsonResponse({"detail": str(error)}, status=400)

    action = (
        f"Deducted {quantity} from {medicine_item.name} stock"
        if operation == "deduct"
        else f"Added {quantity} to {medicine_item.name} stock"
    )
    _log_activity(
        actor,
        action,
        "Stock",
        ActivityRecord.SEVERITY_MEDIUM,
    )
    return JsonResponse({"stock": _stock_payload(stock)}, status=201 if created and operation == "add" else 200)


@csrf_exempt
@require_http_methods(["PUT", "DELETE"])
def medicine_detail_view(request: HttpRequest, medicine_id: int) -> JsonResponse:
    payload = _json_body(request)
    actor = _actor_label(payload)

    try:
        medicine = Medicine.objects.get(id=medicine_id)
    except Medicine.DoesNotExist:
        return JsonResponse({"detail": "Medicine not found."}, status=404)

    if request.method == "DELETE":
        medicine_name = medicine.name
        medicine.delete()
        _log_activity(
            actor,
            f"Deleted medicine {medicine_name}",
            "Inventory",
            ActivityRecord.SEVERITY_HIGH,
        )
        return JsonResponse({"detail": "Medicine deleted successfully."}, status=200)

    previous_name = medicine.name
    previous_quantity = medicine.quantity
    try:
        medicine.name = _parse_name(payload.get("name"))
        medicine.purchase_price = _parse_decimal(payload.get("purchasePrice"))
        medicine.selling_price = _parse_decimal(payload.get("sellingPrice"))
        medicine.quantity = _parse_int(payload.get("quantity"))
        medicine.expiry_date = _parse_date(payload.get("expiryDate"))
    except ValueError as error:
        return JsonResponse({"detail": str(error)}, status=400)

    with transaction.atomic():
        medicine.save()
        _sync_medicine_stock(medicine, previous_name=previous_name)
    _log_activity(
        actor,
        f"Updated medicine {previous_name} to {medicine.name}, stock {previous_quantity} -> {medicine.quantity}",
        "Inventory",
        ActivityRecord.SEVERITY_MEDIUM,
    )
    return JsonResponse({"medicine": _medicine_payload(medicine)})


@csrf_exempt
@require_http_methods(["PATCH", "DELETE"])
def medicine_item_detail_view(request: HttpRequest, item_id: int) -> JsonResponse:
    payload = _json_body(request)
    actor = _actor_label(payload)

    try:
        item = MedicineItem.objects.get(id=item_id)
    except MedicineItem.DoesNotExist:
        return JsonResponse({"detail": "Item not found."}, status=404)

    if request.method == "DELETE":
        item_name = item.name
        item.delete()
        _log_activity(
            actor,
            f"Deleted medicine item {item_name}",
            "Items",
            ActivityRecord.SEVERITY_HIGH,
        )
        return JsonResponse({"detail": "Item deleted successfully."}, status=200)

    previous_name = item.name

    try:
        item.name = _parse_name(payload.get("name"))
        item.save()
    except ValueError as error:
        return JsonResponse({"detail": str(error)}, status=400)
    except IntegrityError:
        return JsonResponse({"detail": "An item with this medicine name already exists."}, status=400)

    _log_activity(
        actor,
        f"Updated medicine item {previous_name} to {item.name}",
        "Items",
        ActivityRecord.SEVERITY_MEDIUM,
    )
    return JsonResponse({"item": _medicine_item_payload(item)})


@require_GET
def orders_view(request: HttpRequest) -> JsonResponse:
    orders = list(OrderRecord.objects.all())
    pending = sum(1 for order in orders if order.status == OrderRecord.STATUS_PENDING)
    issues = sum(1 for order in orders if order.status == OrderRecord.STATUS_ISSUE)
    in_transit = sum(1 for order in orders if order.status == OrderRecord.STATUS_IN_TRANSIT)
    delivered = sum(1 for order in orders if order.status == OrderRecord.STATUS_DELIVERED)

    return JsonResponse(
        {
            "orders": [_order_payload(order) for order in orders],
            "stats": [
                {
                    "label": "Open orders",
                    "value": str(len(orders)),
                    "description": f"{pending} waiting for review or action",
                },
                {
                    "label": "In transit",
                    "value": str(in_transit),
                    "description": "Orders currently moving to pickup or delivery",
                },
                {
                    "label": "Delivered",
                    "value": str(delivered),
                    "description": "Orders completed successfully in the current list",
                },
                {
                    "label": "Needs attention",
                    "value": str(issues),
                    "description": "Orders flagged with delivery or prescription issues",
                },
            ],
        }
    )


@csrf_exempt
@require_http_methods(["POST"])
def create_order_view(request: HttpRequest) -> JsonResponse:
    payload = _json_body(request)
    actor = _actor_label(payload)

    try:
        order = OrderRecord.objects.create(
            customer_name=_parse_required_text(payload.get("customerName"), "Customer name is required."),
            prescription_code=_parse_required_text(payload.get("prescriptionCode"), "Prescription code is required."),
            medicine_name=_parse_required_text(payload.get("medicineName"), "Medicine name is required."),
            quantity=_parse_int(payload.get("quantity")),
            status=_parse_order_status(payload.get("status")),
            priority=_parse_order_priority(payload.get("priority")),
            assigned_to=_parse_required_text(payload.get("assignedTo"), "Assigned team member is required."),
            created_at_label=_parse_required_text(payload.get("createdAtLabel"), "Created label is required."),
        )
    except ValueError as error:
        return JsonResponse({"detail": str(error)}, status=400)

    _log_activity(
        actor,
        f"Created order {order.prescription_code} for {order.customer_name}",
        "Orders",
        ActivityRecord.SEVERITY_MEDIUM,
    )
    return JsonResponse({"order": _order_payload(order)}, status=201)


@csrf_exempt
@require_http_methods(["PATCH", "DELETE"])
def order_detail_view(request: HttpRequest, order_id: int) -> JsonResponse:
    payload = _json_body(request)
    actor = _actor_label(payload)

    try:
        order = OrderRecord.objects.get(id=order_id)
    except OrderRecord.DoesNotExist:
        return JsonResponse({"detail": "Order not found."}, status=404)

    if request.method == "DELETE":
        prescription_code = order.prescription_code
        order.delete()
        _log_activity(
            actor,
            f"Deleted order {prescription_code}",
            "Orders",
            ActivityRecord.SEVERITY_HIGH,
        )
        return JsonResponse({"detail": "Order removed successfully."}, status=200)

    changes: list[str] = []

    try:
        if "status" in payload:
            if payload.get("status") != order.status:
                changes.append(f"status from {order.status} to {payload.get('status')}")
            order.status = _parse_order_status(payload.get("status"))
        if "priority" in payload:
            if payload.get("priority") != order.priority:
                changes.append(f"priority from {order.priority} to {payload.get('priority')}")
            order.priority = _parse_order_priority(payload.get("priority"))
        if "assignedTo" in payload:
            if payload.get("assignedTo") != order.assigned_to:
                changes.append(f"assignee from {order.assigned_to} to {payload.get('assignedTo')}")
            order.assigned_to = _parse_required_text(payload.get("assignedTo"), "Assigned team member is required.")
    except ValueError as error:
        return JsonResponse({"detail": str(error)}, status=400)

    order.save()
    if changes:
      _log_activity(
          actor,
          f"Updated order {order.prescription_code}: " + ", ".join(changes),
          "Orders",
          ActivityRecord.SEVERITY_MEDIUM,
      )
    return JsonResponse({"order": _order_payload(order)})


@require_GET
def sales_view(request: HttpRequest) -> JsonResponse:
    sales = list(SaleRecord.objects.all())
    total_revenue = sum(sale.total_amount for sale in sales if sale.status == SaleRecord.STATUS_COMPLETED)
    pending_count = sum(1 for sale in sales if sale.status == SaleRecord.STATUS_PENDING)
    refunded_count = sum(1 for sale in sales if sale.status == SaleRecord.STATUS_REFUNDED)
    average_value = (
        total_revenue / max(1, sum(1 for sale in sales if sale.status == SaleRecord.STATUS_COMPLETED))
    )

    return JsonResponse(
        {
            "sales": [_sale_payload(sale) for sale in sales],
            "stats": [
                {
                    "label": "Revenue",
                    "value": f"${total_revenue:.2f}",
                    "description": "Completed sales total across the current ledger",
                },
                {
                    "label": "Transactions",
                    "value": str(len(sales)),
                    "description": "All recorded checkout events in the current list",
                },
                {
                    "label": "Average sale",
                    "value": f"${average_value:.2f}",
                    "description": "Average value of completed sales",
                },
                {
                    "label": "Exceptions",
                    "value": str(pending_count + refunded_count),
                    "description": "Pending or refunded sales needing review",
                },
            ],
        }
    )


@csrf_exempt
@require_http_methods(["POST"])
def create_sale_view(request: HttpRequest) -> JsonResponse:
    payload = _json_body(request)
    actor = _actor_label(payload)

    try:
        with transaction.atomic():
            sale = SaleRecord.objects.create(
                customer_name=_parse_required_text(payload.get("customerName"), "Customer name is required."),
                invoice_code=_parse_required_text(payload.get("invoiceCode"), "Invoice code is required."),
                medicine_name=_parse_required_text(payload.get("medicineName"), "Medicine name is required."),
                units=_parse_int(payload.get("units")),
                total_amount=_parse_decimal(payload.get("totalAmount")),
                payment_method=_parse_payment_method(payload.get("paymentMethod")),
                status=_parse_sale_status(payload.get("status")),
                cashier_name=_parse_required_text(payload.get("cashierName"), "Cashier name is required."),
                sold_at_label=_parse_required_text(payload.get("soldAtLabel"), "Sale timestamp label is required."),
            )
            if _sale_status_affects_stock(sale.status):
                _apply_sale_stock_adjustment(sale, "deduct")
    except ValueError as error:
        return JsonResponse({"detail": str(error)}, status=400)

    _log_activity(
        actor,
        f"Recorded sale {sale.invoice_code} for {sale.customer_name}",
        "Sales",
        ActivityRecord.SEVERITY_MEDIUM,
    )
    return JsonResponse({"sale": _sale_payload(sale)}, status=201)


@csrf_exempt
@require_http_methods(["PATCH", "DELETE"])
def sale_detail_view(request: HttpRequest, sale_id: int) -> JsonResponse:
    payload = _json_body(request)
    actor = _actor_label(payload)

    try:
        sale = SaleRecord.objects.get(id=sale_id)
    except SaleRecord.DoesNotExist:
        return JsonResponse({"detail": "Sale not found."}, status=404)

    if request.method == "DELETE":
        invoice_code = sale.invoice_code
        try:
            with transaction.atomic():
                if _sale_status_affects_stock(sale.status):
                    _apply_sale_stock_adjustment(sale, "add")
                sale.delete()
        except ValueError as error:
            return JsonResponse({"detail": str(error)}, status=400)
        _log_activity(
            actor,
            f"Deleted sale {invoice_code}",
            "Sales",
            ActivityRecord.SEVERITY_HIGH,
        )
        return JsonResponse({"detail": "Sale removed successfully."}, status=200)

    changes: list[str] = []

    previous_status = sale.status

    try:
        if "status" in payload:
            if payload.get("status") != sale.status:
                changes.append(f"status from {sale.status} to {payload.get('status')}")
            sale.status = _parse_sale_status(payload.get("status"))
        if "paymentMethod" in payload:
            if payload.get("paymentMethod") != sale.payment_method:
                changes.append(f"payment from {sale.payment_method} to {payload.get('paymentMethod')}")
            sale.payment_method = _parse_payment_method(payload.get("paymentMethod"))
    except ValueError as error:
        return JsonResponse({"detail": str(error)}, status=400)

    try:
        with transaction.atomic():
            if _sale_status_affects_stock(previous_status) and not _sale_status_affects_stock(sale.status):
                _apply_sale_stock_adjustment(sale, "add")
            elif not _sale_status_affects_stock(previous_status) and _sale_status_affects_stock(sale.status):
                _apply_sale_stock_adjustment(sale, "deduct")

            sale.save()
    except ValueError as error:
        return JsonResponse({"detail": str(error)}, status=400)

    if changes:
        _log_activity(
            actor,
            f"Updated sale {sale.invoice_code}: " + ", ".join(changes),
            "Sales",
            ActivityRecord.SEVERITY_MEDIUM,
        )
    return JsonResponse({"sale": _sale_payload(sale)})


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


def _parse_required_text(raw_value: Any, message: str) -> str:
    value = str(raw_value or "").strip()
    if not value:
        raise ValueError(message)
    return value


def _parse_staff_role(raw_value: Any) -> str:
    value = str(raw_value or "").strip()
    if value not in dict(StaffUser.ROLE_CHOICES):
        raise ValueError("User role is invalid.")
    return value


def _parse_staff_status(raw_value: Any) -> str:
    value = str(raw_value or "").strip()
    if value not in dict(StaffUser.STATUS_CHOICES):
        raise ValueError("User status is invalid.")
    return value


def _parse_order_status(raw_value: Any) -> str:
    value = str(raw_value or "").strip()
    if value not in dict(OrderRecord.STATUS_CHOICES):
        raise ValueError("Order status is invalid.")
    return value


def _parse_order_priority(raw_value: Any) -> str:
    value = str(raw_value or "").strip()
    if value not in dict(OrderRecord.PRIORITY_CHOICES):
        raise ValueError("Order priority is invalid.")
    return value


def _parse_payment_method(raw_value: Any) -> str:
    value = str(raw_value or "").strip()
    if value not in dict(SaleRecord.PAYMENT_CHOICES):
        raise ValueError("Payment method is invalid.")
    return value


def _parse_sale_status(raw_value: Any) -> str:
    value = str(raw_value or "").strip()
    if value not in dict(SaleRecord.STATUS_CHOICES):
        raise ValueError("Sale status is invalid.")
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


def _parse_positive_int(raw_value: Any, message: str) -> int:
    try:
        value = int(str(raw_value))
    except (ValueError, TypeError):
        raise ValueError(message)

    if value <= 0:
        raise ValueError("Quantity must be greater than zero.")

    return value


def _parse_optional_date(raw_value: Any) -> date | None:
    if raw_value in (None, ""):
        return None
    return _parse_date(raw_value)


def _parse_stock_operation(raw_value: Any) -> str:
    value = str(raw_value or "").strip().lower()
    if value not in {"add", "deduct"}:
        raise ValueError("Stock operation is invalid.")
    return value
