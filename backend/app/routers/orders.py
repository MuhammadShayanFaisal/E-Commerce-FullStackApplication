from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import joinedload
from decimal import Decimal
from ..database import db_dependency
from .. import models, schemas
from ..auth import get_current_user, require_admin

router = APIRouter(prefix="/orders", tags=["Orders"])

@router.post("/", status_code=status.HTTP_201_CREATED, response_model=schemas.OrderResponse)
def create_order_from_cart(db: db_dependency, current_user: models.User = Depends(get_current_user)):
    cart = db.query(models.Cart).filter(models.Cart.user_id == current_user.id).first()
    if not cart:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cart is empty")

    cart_items = db.query(models.CartItem).filter(models.CartItem.cart_id == cart.id).all()
    if not cart_items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No items in cart")

    total_amount = Decimal("0.00")
    products_map = {}  # Store product objects to avoid multiple queries

    # Validate stock and calculate total
    for ci in cart_items:
        product = db.query(models.Product).filter(models.Product.id == ci.product_id).first()
        if not product:
            raise HTTPException(status_code=400, detail=f"Product {ci.product_id} not found")
        if product.stock is None or product.stock < ci.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for product {product.id}")
        total_amount += Decimal(str(product.price)) * ci.quantity
        products_map[ci.product_id] = product

    # Create order
    order = models.Order(user_id=current_user.id, amount=total_amount)
    db.add(order)
    db.commit()
    db.refresh(order)

    # Create order items and decrement stock
    for ci in cart_items:
        product = products_map[ci.product_id]
        product.stock -= ci.quantity
        oi = models.OrderItem(order_id=order.id, product_id=ci.product_id, quantity=ci.quantity, price=product.price)
        db.add(oi)
        db.delete(ci)

    db.commit()
    db.refresh(order)

    return {"order_id": order.id, "amount": order.amount, "status": order.status}


@router.get("/", dependencies=[Depends(require_admin)])
def list_orders(db: db_dependency):
	orders = db.query(models.Order).options(joinedload(models.Order.items)).all()
	return [
		{
			"id": o.id,
			"user_id": o.user_id,
			"amount": str(o.amount),
			"status": o.status.value,
			"items": [
				{"product_id": it.product_id, "quantity": it.quantity, "price": str(it.price)} for it in o.items
			],
		}
		for o in orders
	]


@router.get("/me")
def list_my_orders(db: db_dependency, current_user: models.User = Depends(get_current_user)):
	orders = (
		db.query(models.Order)
		.filter(models.Order.user_id == current_user.id)
		.options(joinedload(models.Order.items))
		.all()
	)
	return [
		{
			"id": o.id,
			"amount": str(o.amount),
			"status": o.status.value,
			"items": [
				{"product_id": it.product_id, "quantity": it.quantity, "price": str(it.price)} for it in o.items
			],
		}
		for o in orders
	]


@router.get("/{order_id}")
def get_order(order_id: int, db: db_dependency, current_user: models.User = Depends(get_current_user)):
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
	return {
		"id": order.id,
		"user_id": order.user_id,
		"amount": str(order.amount),
		"status": order.status.value,
		"items": [{"product_id": it.product_id, "quantity": it.quantity, "price": str(it.price)} for it in order.items],
	}

