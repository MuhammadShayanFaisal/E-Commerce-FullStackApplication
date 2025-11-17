from fastapi import APIRouter, Depends, HTTPException, status
from .. import models, schemas
from ..database import db_dependency
from ..auth import get_current_user


router = APIRouter(
    prefix="/user-profile",
    tags=["User Profile"]
)

@router.get("/me", response_model=schemas.UserResponse)
def get_my_profile(current_user: models.User = Depends(get_current_user)):
	return current_user


@router.put("/me", response_model=schemas.UserResponse)
def update_my_profile(update: schemas.UserUpdate, db: db_dependency = None, current_user: models.User = Depends(get_current_user)):
	# Only allow updating own profile fields
	if update.username:
		current_user.username = update.username
	if update.email:
		# Ensure uniqueness
		exists = db.query(models.User).filter(models.User.email == update.email, models.User.id != current_user.id).first()
		if exists:
			raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use")
		current_user.email = update.email
	if update.location is not None:
		current_user.location = update.location
	if update.payment_options is not None:
		current_user.payment_options = update.payment_options
	db.commit()
	db.refresh(current_user)
	return current_user
