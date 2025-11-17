from fastapi import APIRouter, status, HTTPException
from .. import schemas, models
from ..database import db_dependency
from ..utils import hash_password
from typing import List


router = APIRouter(
    prefix="/user",
    tags=["User"]
)

@router.post("/registration", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def user_register(user: schemas.UserRegister, db: db_dependency):

    # Check if user with email already exists
    existing_user = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, 
            detail=f"User with email {user.email} already exists"
        )
    
    # Check if username already exists
    existing_username = db.query(models.User).filter(models.User.username == user.username).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Username {user.username} is already taken"
        )
    
    # Hash the password before storing
    hashed_password = hash_password(user.password)
    
    # Create new user
    new_user = models.User(
        username=user.username,
        email=user.email,
        password=hashed_password,
        location=user.location or "",
        payment_options=user.payment_options,
        role=user.role
    )
    
    # Add to database
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user


@router.get("/{user_id}", response_model=schemas.UserResponse)
def get_user(user_id: int, db: db_dependency):

    user = db.query(models.User).filter(models.User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    
    return user


@router.get("/", response_model=List[schemas.UserResponse])
def get_all_users(db: db_dependency, skip: int = 0, limit: int = 100):

    users = db.query(models.User).offset(skip).limit(limit).all()
    return users


@router.put("/{user_id}", response_model=schemas.UserResponse)
def update_user(user_id: int, user_update: schemas.UserUpdate, db: db_dependency):

    user = db.query(models.User).filter(models.User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    
    # Check if email is being updated and if it's already taken
    if user_update.email and user_update.email != user.email:
        existing_user = db.query(models.User).filter(models.User.email == user_update.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Email {user_update.email} is already taken"
            )
        user.email = user_update.email
    
    # Check if username is being updated and if it's already taken
    if user_update.username and user_update.username != user.username:
        existing_username = db.query(models.User).filter(models.User.username == user_update.username).first()
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Username {user_update.username} is already taken"
            )
        user.username = user_update.username
    
    # Update other fields if provided
    if user_update.location is not None:
        user.location = user_update.location
    if user_update.payment_options is not None:
        user.payment_options = user_update.payment_options
    
    db.commit()
    db.refresh(user)
    
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: db_dependency):

    user = db.query(models.User).filter(models.User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    
    db.delete(user)
    db.commit()
    
    return None

