from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, DECIMAL, ForeignKey, Enum, TIMESTAMP
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime
import enum


class PaymentMethod(enum.Enum):

    CARD = "Card"
    CASH = "Cash"
    WALLET = "Wallet"

class PaymentStatus(enum.Enum):

    PENDING = "Pending"
    COMPLETED = "Completed"
    FAILED = "Failed"

class Role(enum.Enum):

    USER = 'User'
    ADMIN = 'Admin'

class OrderStatus(enum.Enum):
    
    PENDING = "Pending"
    SHIPPED = "Shipped"
    DELIVERED = "Delivered"
    CANCELLED = "Cancelled"
    
class StockActionType(enum.Enum):

    RESTOCK = "Restock"
    SALE = "Sale"
    RETURN = "Return"
    ADJUSTMENT = "Adjustment"

class AlertStatus(enum.Enum):

    ACTIVE = "Active"
    RESOLVED = "Resolved"
    DISMISSED = "Dismiised"



class User(Base):

    __tablename__ = "Users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(20), nullable=False, unique=True)
    email = Column(String(200), nullable=False, unique=True)
    password = Column(String(100), nullable=False)
    location = Column(String(100), default="")
    role = Column(Enum(Role), default=Role.USER, nullable=False)
    payment_options = Column(Enum(PaymentMethod), default=PaymentMethod.CARD, nullable=False)
    is_verified = Column(Boolean,default=False)
    join_data = Column(DateTime ,default=datetime.utcnow)

    # realtionships
    orders = relationship("Order", back_populates="user")
    cart = relationship("Cart", back_populates="user", uselist=False)
    cart_items = relationship("CartItem", back_populates="user")

class Category(Base):

    __tablename__ = "Categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(20), nullable=False, unique=True)
    description = Column(Text)

    products = relationship("Product", back_populates="category") 

class Product(Base):

    __tablename__ = "Products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(20), nullable=False)
    description = Column(Text, nullable=False)
    price = Column(DECIMAL(10,2), nullable=False)
    stock = Column(Integer, nullable=False)
    min_stock_level = Column(Integer, nullable=False)
    category_id = Column(Integer, ForeignKey(Category.id))
    created_at = Column(DateTime, default=datetime.utcnow)

    # relationship
    category = relationship("Category", back_populates="products")
    order_items = relationship("OrderItem", back_populates="product")
    cart_items = relationship("CartItem", back_populates="product")
    stock_transactions = relationship("StockTransaction", back_populates="product")

class Order(Base):

    __tablename__ = "Orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey(User.id), nullable=False)
    status = Column(Enum(OrderStatus), default=OrderStatus.PENDING, nullable=False)
    created_at = Column(DateTime, default= datetime.utcnow)
    amount = Column(DECIMAL(10, 2), nullable=False)

    # relationship
    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    payment = relationship("Payment", back_populates="order", uselist=False)
    invoice = relationship("Invoice", back_populates="order", uselist=False)

class OrderItem(Base):

    __tablename__ = "OrderItems"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey(Order.id), nullable=False)
    product_id = Column(Integer, ForeignKey(Product.id), nullable=False)
    quantity = Column(Integer, nullable=False)
    price = Column(DECIMAL(10,2), nullable=False)

    # relationship
    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")


class Cart(Base):

    __tablename__ = "Carts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey(User.id), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # relationship
    user = relationship("User", back_populates="cart")
    items = relationship("CartItem", back_populates="cart", cascade="all, delete-orphan")

class CartItem(Base):

    __tablename__ ="CartItems"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey(User.id), nullable=False)
    cart_id = Column(Integer, ForeignKey(Cart.id), nullable=False)
    product_id = Column(Integer, ForeignKey(Product.id), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)

    cart = relationship("Cart", back_populates="items")
    product = relationship("Product", back_populates="cart_items")
    user = relationship("User", back_populates="cart_items")


class Payment(Base):

    __tablename__ = "Payments"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey(Order.id), nullable=False)
    amount = Column(DECIMAL, nullable=False)
    method = Column(Enum(PaymentMethod), nullable=False)
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    transaction_id = Column(String(100), unique=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    order = relationship("Order", back_populates="payment")
    
class Invoice(Base):

    __tablename__ = "Invoices"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey(Order.id), nullable=False)
    amount = Column(DECIMAL(10,2), nullable=False)
    invoice_date = Column(DateTime, default=datetime.utcnow)
    shipping_date = Column(DateTime, nullable=True)

    order = relationship("Order", back_populates="invoice")

class StockTransaction(Base):

    __tablename__ = "StockTransactions"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey(Product.id), nullable=False)
    action_type = Column(Enum(StockActionType), nullable=False)
    quantity_changed = Column(Integer, nullable=False)
    transaction_date = Column(DateTime, default=datetime.utcnow)
    remarks = Column(Text, nullable=True)

    product = relationship("Product", back_populates="stock_transactions")


class StockAlert(Base):

    __tablename__ = "StockAlerts"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey(Product.id), nullable=False)
    alert_date = Column(DateTime, default=datetime.utcnow)
    message = Column(Text, nullable=False)
    status = Column(Enum(AlertStatus), default=AlertStatus.ACTIVE, nullable=False)

    product = relationship("Product")

