from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import joinedload
from sqlalchemy import func, case, extract
from typing import Optional
from datetime import datetime, timedelta

from ..database import db_dependency
from ..auth import require_admin
from .. import models

router = APIRouter(prefix="/analytics", tags=["Analytics"], dependencies=[Depends(require_admin)])


@router.get("/summary")
async def get_summary(db: db_dependency):
    total_revenue = db.query(func.coalesce(func.Sum(models.Order.amount), 0)).scalar()
    total_orders = db.query(func.count(models.Order.id)).scalar()
    total_products = db.query(func.count(models.Product.id)).scalar()
    total_customers = db.query(func.count(models.User.id)).filter(
        models.User.role == models.Role.USER
    ).scalar()
    avg_order_value = (total_revenue / total_orders) if total_orders else 0
    return {
        "total_revenue": float(total_revenue),
        "total_orders": total_orders,
        "total_products": total_products,
        "total_customers": total_customers,
        "avg_order_value": float(avg_order_value),
    }


@router.get("/sales-over-time")
async def get_sales_over_time(
    db: db_dependency,
    period: str = Query("month", enum=["day", "week", "month"]),
    months: int = Query(12, ge=1, le=24),
):
    now = datetime.utcnow()
    start = now - timedelta(days=months * 30)
    orders = (
        db.query(models.Order)
        .filter(models.Order.created_at >= start)
        .filter(models.Order.status != models.OrderStatus.CANCELLED)
        .all()
    )
    buckets: dict[str, dict] = {}
    for order in orders:
        if period == "day":
            key = order.created_at.strftime("%Y-%m-%d")
        elif period == "week":
            key = order.created_at.strftime("%Y-W%U")
        else:
            key = order.created_at.strftime("%Y-%m")
        if key not in buckets:
            buckets[key] = {"period": key, "revenue": 0.0, "orders": 0}
        buckets[key]["revenue"] += float(order.amount)
        buckets[key]["orders"] += 1
    result = [buckets[k] for k in sorted(buckets.keys())]
    return result


@router.get("/best-sellers")
async def get_best_sellers(
    db: db_dependency,
    limit: int = Query(10, ge=1, le=50),
):
    rows = (
        db.query(
            models.Product.id,
            models.Product.name,
            func.coalesce(func.sum(models.OrderItem.quantity), 0).label("units_sold"),
            func.coalesce(func.sum(models.OrderItem.quantity * models.OrderItem.price), 0).label("revenue"),
        )
        .outerjoin(models.OrderItem, models.OrderItem.product_id == models.Product.id)
        .group_by(models.Product.id)
        .order_by(func.sum(models.OrderItem.quantity).desc())
        .limit(limit)
        .all()
    )
    return [
        {"id": r.id, "name": r.name, "units_sold": int(r.units_sold), "revenue": float(r.revenue)}
        for r in rows
    ]


@router.get("/unsold-products")
async def get_unsold_products(db: db_dependency):
    sold_ids = db.query(models.OrderItem.product_id).distinct().subquery()
    products = (
        db.query(models.Product)
        .options(joinedload(models.Product.category))
        .filter(~models.Product.id.in_(sold_ids))
        .all()
    )
    return [
        {
            "id": p.id,
            "name": p.name,
            "stock": p.stock,
            "category": p.category.name if p.category else None,
        }
        for p in products
    ]


@router.get("/recent-orders")
async def get_recent_orders(
    db: db_dependency,
    limit: int = Query(10, ge=1, le=50),
):
    rows = (
        db.query(models.Order, models.User.username)
        .join(models.User, models.User.id == models.Order.user_id)
        .order_by(models.Order.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "order_id": order.id,
            "customer": username,
            "status": order.status.value,
            "amount": float(order.amount),
            "created_at": order.created_at.isoformat(),
        }
        for order, username in rows
    ]
