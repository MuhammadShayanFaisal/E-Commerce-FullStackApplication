from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, DECIMAL, ForeignKey, Enum, TIMESTAMP
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime
import enum
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, DECIMAL, ForeignKey, Enum, TIMESTAMP
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime
import enum


class PaymentMethodType(enum.Enum):
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
    DISMISSED = "Dismissed"


class User(Base):
    __tablename__ = "Users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(20), nullable=False, unique=True)
    email = Column(String(200), nullable=False, unique=True)
    password = Column(String(100), nullable=False)
    role = Column(Enum(Role), default=Role.USER, nullable=False)
    is_verified = Column(Boolean, default=False)
    join_date = Column(DateTime, default=datetime.utcnow) 

    # Relationships
    addresses = relationship("Address", back_populates="user", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="user")
    cart = relationship("Cart", back_populates="user", uselist=False)

class Address(Base):
    """
    New Table: Normalizes 'location' to allow multiple addresses per user 
    and atomic fields (City, State, Zip).
    """
    __tablename__ = "Addresses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("Users.id"), nullable=False)
    street_line_1 = Column(String(100), nullable=False)
    street_line_2 = Column(String(100), nullable=True)
    city = Column(String(50), nullable=False)
    state = Column(String(50), nullable=False)
    zip_code = Column(String(20), nullable=False)
    country = Column(String(50), default="Pakistan")
    is_default = Column(Boolean, default=False)

    user = relationship("User", back_populates="addresses")
    orders = relationship("Order", back_populates="shipping_address")

class Category(Base):
    __tablename__ = "Categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False, unique=True)
    description = Column(Text)

    products = relationship("Product", back_populates="category", cascade="all, delete-orphan")

class Product(Base):
    __tablename__ = "Products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    price = Column(DECIMAL(10, 2), nullable=False)
    stock = Column(Integer, nullable=False)
    min_stock_level = Column(Integer, nullable=False)
    category_id = Column(Integer, ForeignKey("Categories.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    category = relationship("Category", back_populates="products")
    # Order items and Cart items references
    stock_transactions = relationship("StockTransaction", back_populates="product")

class Order(Base):
    __tablename__ = "Orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("Users.id"), nullable=False)
    
    shipping_address_id = Column(Integer, ForeignKey("Addresses.id"), nullable=False)
    status = Column(Enum(OrderStatus), default=OrderStatus.PENDING, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    total_amount = Column(DECIMAL(10, 2), nullable=False) 

    # Relationships
    user = relationship("User", back_populates="orders")
    shipping_address = relationship("Address", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    payment = relationship("Payment", back_populates="order", uselist=False)
    invoice = relationship("Invoice", back_populates="order", uselist=False)

class OrderItem(Base):
    __tablename__ = "OrderItems"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("Orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("Products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(DECIMAL(10, 2), nullable=False) 

    order = relationship("Order", back_populates="items")
    product = relationship("Product") 

class Cart(Base):
    __tablename__ = "Carts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("Users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="cart")
    items = relationship("CartItem", back_populates="cart", cascade="all, delete-orphan")

class CartItem(Base):
    __tablename__ = "CartItems"

    id = Column(Integer, primary_key=True, index=True)
    cart_id = Column(Integer, ForeignKey("Carts.id"), nullable=False) # Only link to Cart
    product_id = Column(Integer, ForeignKey("Products.id"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)

    cart = relationship("Cart", back_populates="items")
    product = relationship("Product")

class Payment(Base):
    __tablename__ = "Payments"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("Orders.id"), nullable=False)
    amount = Column(DECIMAL(10, 2), nullable=False)
    method = Column(Enum(PaymentMethodType), nullable=False)
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    transaction_id = Column(String(100), unique=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    order = relationship("Order", back_populates="payment")

class Invoice(Base):
    __tablename__ = "Invoices"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("Orders.id"), nullable=False)
    amount = Column(DECIMAL(10, 2), nullable=False)
    invoice_date = Column(DateTime, default=datetime.utcnow)
    
    order = relationship("Order", back_populates="invoice")

class StockTransaction(Base):
    __tablename__ = "StockTransactions"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("Products.id"), nullable=False)
    action_type = Column(Enum(StockActionType), nullable=False)
    quantity_changed = Column(Integer, nullable=False)
    transaction_date = Column(DateTime, default=datetime.utcnow)
    remarks = Column(Text, nullable=True)

    product = relationship("Product", back_populates="stock_transactions")

class StockAlert(Base):
    __tablename__ = "StockAlerts"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("Products.id"), nullable=False)
    alert_date = Column(DateTime, default=datetime.utcnow)
    message = Column(Text, nullable=False)
    status = Column(Enum(AlertStatus), default=AlertStatus.ACTIVE, nullable=False)

    product = relationship("Product")