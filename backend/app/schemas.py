import enum
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime
from decimal import Decimal
from enum import Enum

class PaymentMethodEnum(str, Enum):
    CARD = "Card"
    CASH = "Cash"
    WALLET = "Wallet"

class PaymentStatusEnum(str, Enum):
    PENDING = "Pending"
    COMPLETED = "Completed"
    FAILED = "Failed"

class OrderStatusEnum(str, Enum):
    PENDING = "Pending"
    SHIPPED = "Shipped"
    DELIVERED = "Delivered"
    CANCELLED = "Cancelled"

class RoleEnum(str, Enum):
    USER = 'User'
    ADMIN = 'Admin'

class UserRegister(BaseModel):
    username: str = Field(min_length=7, max_length=20)
    email: EmailStr
    password: str = Field(min_length=8, max_length=10)
    location: Optional[str] = Field(default="", max_length=100)
    payment_options: PaymentMethodEnum = PaymentMethodEnum.CARD
    role: RoleEnum = RoleEnum.USER

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    location: str
    role: RoleEnum
    payment_options: PaymentMethodEnum
    is_verified: bool
    join_data: datetime

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=7, max_length=20)
    email: Optional[EmailStr] = None
    location: Optional[str] = Field(None, max_length=100)
    payment_options: Optional[PaymentMethodEnum] = None


class CategoryResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

    class Config:
        from_attributes = True

class ProductResponse(BaseModel):
    id: int
    name: str
    description: str
    price: Decimal
    stock: int
    min_stock_level: int
    created_at: datetime
    category: Optional[CategoryResponse] = None

    class Config:
        from_attributes = True

class ProductCreate(BaseModel):
    name: str
    description: str
    price: Decimal
    stock: int
    min_stock_level: int
    category_id: int

    class Config:
        from_attributes = True

class PaginatedProductResponse(BaseModel):
    products: List[ProductResponse]
    total: int
    page: int
    limit: int
    total_pages: int


class CartItemResponse(BaseModel):
    id: int
    user_id: int
    cart_id: int
    product_id: int
    quantity: int
    created_at: datetime
    
    class Config:
        from_attributes = True



class OrderResponse(BaseModel):
    order_id: int
    amount: Decimal
    status: OrderStatusEnum

