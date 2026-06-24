import datetime
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, JSON, ForeignKey, Boolean
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from database import Base

class DBUser(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String(20), unique=True, index=True, nullable=True)
    username = Column(String(100), unique=True, index=True, nullable=True)
    email = Column(String(100), unique=True, index=True, nullable=True)
    name = Column(String(100), nullable=True)
    password_hash = Column(String(200), nullable=True)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="RESTRICT"), nullable=False)
    profile_picture = Column(String(200), nullable=True)
    wishlist = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=False, nullable=False)
    email_verified = Column(Boolean, default=False, nullable=False)
    phone_verified = Column(Boolean, default=False, nullable=False)
    email_otp = Column(String(20), nullable=True)
    phone_otp = Column(String(20), nullable=True)
    email_otp_expires_at = Column(DateTime, nullable=True)
    phone_otp_expires_at = Column(DateTime, nullable=True)
    last_email_otp_sent_at = Column(DateTime, nullable=True)
    last_phone_otp_sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class DBOrder(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=False)
    address = Column(Text, nullable=False)
    items = Column(JSON, nullable=False)
    total_price = Column(Float, nullable=False)
    status = Column(String(50), default="Pending")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

# Pydantic validation schemas
class UserCreate(BaseModel):
    phone: Optional[str] = Field(None, min_length=10, max_length=15)
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[str] = Field(None, max_length=100)
    name: Optional[str] = Field(None, max_length=100)
    password: Optional[str] = Field(None, min_length=6)
    role_id: int

class UserResponse(BaseModel):
    id: int
    phone: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    role_id: int
    profile_picture: Optional[str] = None
    wishlist: Optional[List[int]] = []
    is_active: bool = False
    email_verified: bool = False
    phone_verified: bool = False
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class CustomerRegister(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    phone: str = Field(..., min_length=10, max_length=15)
    email: str = Field(..., max_length=100)
    password: str = Field(..., min_length=6)

class CustomerLogin(BaseModel):
    username: str  # Can be phone or email
    password: str

class PasswordChange(BaseModel):
    old_password: str
    new_password: str

class PasswordReset(BaseModel):
    phone: str
    email: str
    new_password: str

class UserProfileUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, min_length=10, max_length=15)
    email: Optional[str] = Field(None, max_length=100)
    profile_picture: Optional[str] = Field(None, max_length=200)

class CartItem(BaseModel):
    product_id: int
    name: str
    quantity: int = Field(..., gt=0)
    price: float = Field(..., gt=0)
    chosen_variation: Optional[Dict[str, str]] = Field(None)

class OrderCreate(BaseModel):
    customer_name: str = Field(..., min_length=1)
    phone: str = Field(..., min_length=10, max_length=15)
    address: str = Field(..., min_length=5)
    items: List[CartItem]
    total_price: float = Field(..., gt=0)
    coupon_code: Optional[str] = None

class OrderResponse(OrderCreate):
    id: int
    status: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class VerifyEmailRequest(BaseModel):
    email: str = Field(..., max_length=100)
    otp: str = Field(..., min_length=6, max_length=6)

class VerifyPhoneRequest(BaseModel):
    phone: str = Field(..., min_length=10, max_length=15)
    otp: str = Field(..., min_length=6, max_length=6)

class ResendEmailRequest(BaseModel):
    email: str = Field(..., max_length=100)

class ResendPhoneRequest(BaseModel):
    phone: str = Field(..., min_length=10, max_length=15)

