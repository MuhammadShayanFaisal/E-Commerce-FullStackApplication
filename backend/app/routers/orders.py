# pyright: reportMissingImports=false
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import joinedload  # type: ignore[import]
from decimal import Decimal
from ..database import db_dependency
from .. import models, schemas
from ..auth import get_current_user, require_admin

router = APIRouter(prefix="/orders", tags=["Orders"])


def serialize_order(order: models.Order) -> schemas.OrderDetailResponse:
	return schemas.OrderDetailResponse(
		id=order.id,
		user_id=order.user_id,
		amount=order.amount,
		status=order.status.value,
		created_at=order.created_at,
		items=[
			schemas.OrderItemDetail(
				product_id=item.product_id,
				quantity=item.quantity,
				price=item.price,
			)
			for item in order.items
		],
	)


@router.post("", status_code=status.HTTP_201_CREATED, response_model=schemas.OrderResponse)
async def create_order_from_cart(db: db_dependency, current_user: models.User = Depends(get_current_user)):
	cart = db.query(models.Cart).filter(models.Cart.user_id == current_user.id).first()
	if not cart:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cart is empty")

	cart_items = db.query(models.CartItem).filter(models.CartItem.cart_id == cart.id).all()
	if not cart_items:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No items in cart")

	total_amount = Decimal("0.00")
	products_map = {}

	for ci in cart_items:
		product = db.query(models.Product).filter(models.Product.id == ci.product_id).with_for_update().first()
		if not product:
			raise HTTPException(status_code=400, detail=f"Product {ci.product_id} not found")
		if product.stock is None or product.stock < ci.quantity:
			raise HTTPException(status_code=400, detail=f"Insufficient stock for product {product.id}")
		total_amount += Decimal(str(product.price)) * ci.quantity
		products_map[ci.product_id] = product

	try:
		order = models.Order(user_id=current_user.id, amount=total_amount)
		db.add(order)
		db.flush()

		for ci in cart_items:
			product = products_map[ci.product_id]
			product.stock -= ci.quantity
			order_item = models.OrderItem(
				order_id=order.id,
				product_id=ci.product_id,
				quantity=ci.quantity,
				price=product.price,
			)
			db.add(order_item)
			db.delete(ci)

		db.commit()
		db.refresh(order)
	except Exception:
		db.rollback()
		raise

	return {"order_id": order.id, "amount": order.amount, "status": order.status}


@router.get("", response_model=List[schemas.OrderDetailResponse], dependencies=[Depends(require_admin)])
async def list_orders(db: db_dependency):
	orders = db.query(models.Order).options(joinedload(models.Order.items)).all()
	return [serialize_order(order) for order in orders]


@router.get("/me", response_model=List[schemas.OrderDetailResponse])
async def list_my_orders(db: db_dependency, current_user: models.User = Depends(get_current_user)):
	orders = (
		db.query(models.Order)
		.filter(models.Order.user_id == current_user.id)
		.options(joinedload(models.Order.items))
		.all()
	)
	return [serialize_order(order) for order in orders]


@router.get("/{order_id}", response_model=schemas.OrderDetailResponse)
async def get_order(order_id: int, db: db_dependency, current_user: models.User = Depends(get_current_user)):
	order = (
		db.query(models.Order)
		.filter(models.Order.id == order_id)
		.options(joinedload(models.Order.items))
		.first()
	)
	if not order:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
	if order.user_id != current_user.id and current_user.role.name != "ADMIN":
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this order")
	return serialize_order(order)

