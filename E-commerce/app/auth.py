from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from .database import db_dependency, get_db
from . import models
from .utils import verify_password

# JWT settings
SECRET_KEY = "b9b1989a9b24da5580924a21bcac92ad1f5b9e052f46a09792f265e9e66d5baf"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
	claims = data.copy()
	expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
	claims.update({"exp": expire})
	return jwt.encode(claims, SECRET_KEY, algorithm=ALGORITHM)


def authenticate_user(db, email: str, password: str) -> Optional[models.User]:
	user = db.query(models.User).filter(models.User.email == email).first()
	if not user:
		return None
	if not verify_password(password, user.password):
		return None
	return user


def get_current_user(db: db_dependency, token: str = Depends(oauth2_scheme)) -> models.User:
	credentials_exception = HTTPException(
		status_code=status.HTTP_401_UNAUTHORIZED,
		detail="Could not validate credentials",
		headers={"WWW-Authenticate": "Bearer"},
	)
	try:
		payload = jwt.decode(token, SECRET_KEY, algorithms=ALGORITHM)
		user_id: str = payload.get("sub")
		if user_id is None:
			raise credentials_exception
		user_id = int(user_id)
	except JWTError:
		raise credentials_exception

	user = db.query(models.User).filter(models.User.id == user_id).first()
	if user is None:
		raise credentials_exception
	return user


def require_admin(user: models.User = Depends(get_current_user)) -> models.User:
	if user.role != models.Role.ADMIN:
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
	return user


