from math import prod
from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional, List
from ..database import db_dependency
from .. import schemas, models
from sqlalchemy.orm import joinedload
from ..auth import require_admin, get_current_user

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("/", response_model=schemas.PaginatedProductResponse)
def list_products(
	db: db_dependency,
	page: int = Query(1, ge=1),
	limit: int = Query(10, ge=1, le=100),
	category_id: Optional[int] = None,
	search: Optional[str] = None
):
	query = db.query(models.Product).options(joinedload(models.Product.category))
	if category_id:
		query = query.filter(models.Product.category_id == category_id)
	if search:
		query = query.filter(models.Product.name.ilike(f"%{search}%"))
	total = query.count()
	products = query.offset((page - 1) * limit).limit(limit).all()
	total_pages = (total + limit - 1) // limit
	return {"products": products, "total": total, "page": page, "limit": limit, "total_pages": total_pages}


@router.get("/{product_id}", response_model=schemas.ProductResponse)
def get_product_by_id(product_id: int, db: db_dependency):
	product = (
		db.query(models.Product)
		.options(joinedload(models.Product.category))
		.filter(models.Product.id == product_id)
		.first()
	)
	if not product:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product with id {product_id} not found")
	return product


@router.post("/", response_model=schemas.ProductResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)])
def create_product(product: schemas.ProductCreate, db: db_dependency):
	# Minimal validation; in a real app use a ProductCreate schema
	product = models.Product(
		name=product.name,
		description=product.description,
		price=product.price,
		stock=product.stock,
		min_stock_level=product.min_stock_level,
		category_id=product.category_id,
	)
	db.add(product)
	db.commit()
	db.refresh(product)
	return product


@router.put("/{product_id}", response_model=schemas.ProductResponse, dependencies=[Depends(require_admin)])
def update_product(product_id: int, product: schemas.ProductCreate, db: db_dependency):
	prd = db.query(models.Product).filter(models.Product.id == product_id).first()
	if not prd:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
	prd.name = product.name
	prd.description = product.description
	prd.price = product.price
	prd.stock = product.stock
	prd.min_stock_level = product.min_stock_level
	prd.category_id = product.category_id
	db.commit()
	db.refresh(prd)
	return prd


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
def delete_product(product_id: int, db: db_dependency):
	product = db.query(models.Product).filter(models.Product.id == product_id).first()
	if not product:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
	db.delete(product)
	db.commit()
	return None