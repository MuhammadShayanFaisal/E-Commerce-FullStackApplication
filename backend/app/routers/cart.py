from fastapi import APIRouter, Depends, HTTPException, status
from ..database import db_dependency
from .. import models, schemas
from ..auth import get_current_user
from typing import List

router = APIRouter(prefix="/cart", tags=["Cart"])


def get_or_create_cart(db, user_id: int):
	cart = db.query(models.Cart).filter(models.Cart.user_id == user_id).first()
	if not cart:
		cart = models.Cart(user_id=user_id)
		db.add(cart)
		db.commit()
		db.refresh(cart)

	return cart


@router.get("/me",status_code = status.HTTP_200_OK, response_model=List[schemas.CartItemResponse])
def get_my_cart(db: db_dependency, current_user: models.User = Depends(get_current_user)):
	cart = get_or_create_cart(db, current_user.id)
	items = (
		db.query(models.CartItem)
		.filter(models.CartItem.cart_id == cart.id)
		.all()
	)
	return items


@router.post("/add", status_code=status.HTTP_201_CREATED, response_model=schemas.CartItemResponse)
def add_to_cart(product_id: int, quantity: int = 1, db: db_dependency = None, current_user: models.User = Depends(get_current_user)):
	if quantity < 1:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quantity must be >= 1")
	
	product = db.query(models.Product).filter(models.Product.id == product_id).first()
	if not product:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

	cart = get_or_create_cart(db, current_user.id)
	
	item = (
		db.query(models.CartItem)
		.filter(models.CartItem.cart_id == cart.id, models.CartItem.product_id == product_id)
		.first()
	)
	if item:
		item.quantity += quantity
	else:
		item = models.CartItem(user_id=current_user.id, cart_id=cart.id, product_id=product_id, quantity=quantity)
		db.add(item)

	db.commit()
	db.refresh(item)
	return item


@router.put("/update", status_code=status.HTTP_200_OK, response_model=schemas.CartItemResponse)
def update_cart_item(item_id: int, quantity: int, db: db_dependency = None, current_user: models.User = Depends(get_current_user)):
	item = db.query(models.CartItem).filter(models.CartItem.id == item_id, models.CartItem.user_id == current_user.id).first()
	if not item:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart item not found")
	if quantity < 1:
		db.delete(item)
	else:
		item.quantity = quantity
	db.commit()
	return item


@router.delete("/remove/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_cart_item(item_id: int, db: db_dependency, quantity: int=1, current_user: models.User = Depends(get_current_user)):
	item = db.query(models.CartItem).filter(models.CartItem.id == item_id, models.CartItem.user_id == current_user.id).first()
	if not item:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart item not found")
	
	if item.quantity==quantity:
		db.delete(item)

	if item.quantity>=quantity:
		item.quantity-=quantity
	else:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Donot have enough quantity")
	db.commit()
	return None

