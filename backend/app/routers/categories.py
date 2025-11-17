from fastapi import APIRouter, Depends, HTTPException, status
from ..database import db_dependency
from .. import models, schemas
from ..auth import require_admin
from typing import List

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("/", status_code=status.HTTP_200_OK, response_model=List[schemas.CategoryResponse])
def list_categories(db: db_dependency):
	cats = db.query(models.Category).all()
	return [c for c in cats]


@router.get("/{category_id}", status_code=status.HTTP_200_OK, response_model=schemas.CategoryResponse)
def get_category(category_id: int, db: db_dependency):
	c = db.query(models.Category).filter(models.Category.id == category_id).first()
	if not c:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
	return c


@router.post("/", status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)], response_model=schemas.CategoryResponse)
def create_category(category: schemas.CategoryCreate, db: db_dependency):
	if db.query(models.Category).filter(models.Category.name == category.name).first():
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Category name already exists")
	c = models.Category(name=category.name, description=category.description)
	db.add(c)
	db.commit()
	db.refresh(c)
	return c


@router.put("/{category_id}", dependencies=[Depends(require_admin)], status_code=status.HTTP_200_OK, response_model=schemas.CategoryResponse)
def update_category(category_id: int, category: schemas.CategoryUpdate, db: db_dependency):
	c = db.query(models.Category).filter(models.Category.id == category_id).first()
	if not c:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
	if category.name:
		exists = db.query(models.Category).filter(models.Category.name == category.name, models.Category.id != category_id).first()
		if exists:
			raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Category name already exists")
		c.name = category.name
	if category.description:
		c.description = category.description
	db.commit()
	db.refresh(c)
	return c


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
def delete_category(category_id: int, db: db_dependency):
	c = db.query(models.Category).filter(models.Category.id == category_id).first()
	if not c:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
	db.delete(c)
	db.commit()
	return None


