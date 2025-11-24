from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from ..database import db_dependency
from .. import models
from ..auth import authenticate_user, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: db_dependency = None):
	# form_data.username will carry email in our case
	user = authenticate_user(db, email=form_data.username, password=form_data.password)
	if not user:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

	access_token = create_access_token({"sub": str(user.id)})
	return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me")
def read_current_user(current_user: models.User = Depends(get_current_user)):
	return {
		"id": current_user.id,
		"username": current_user.username,
		"email": current_user.email,
		"role": current_user.role.value,
	}


