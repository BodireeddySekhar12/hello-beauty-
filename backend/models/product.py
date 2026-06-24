import datetime
from sqlalchemy import Column, Integer, String, Float, Text, JSON, ForeignKey, DateTime
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from database import Base

class DBProduct(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(50), nullable=False)  # Direct text field for backward compatibility
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    subcategory_id = Column(Integer, ForeignKey("subcategories.id"), nullable=True)
    seller_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    price = Column(Float, nullable=False)
    stock = Column(Integer, nullable=False)
    image_url = Column(String(500), nullable=True)
    brand = Column(String(100), nullable=True)
    discount = Column(Float, default=0.0)
    rating = Column(Float, default=0.0)
    variations = Column(JSON, nullable=True)
    views = Column(Integer, default=0)
    clicks = Column(Integer, default=0)

class DBSellerProduct(Base):
    __tablename__ = "seller_products"

    id = Column(Integer, primary_key=True, index=True)
    seller_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)

class DBInventoryLog(Base):
    __tablename__ = "inventory_logs"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    change_amount = Column(Integer, nullable=False)
    reason = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

# Pydantic validation schemas
class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., max_length=1000)
    category: str = Field(..., min_length=1, max_length=50)
    price: float = Field(..., gt=0, description="Product price must be greater than zero")
    stock: int = Field(..., ge=0, description="Stock must be greater than or equal to zero")
    image_url: Optional[str] = Field(None, description="URL of the product image")
    brand: Optional[str] = Field(None, description="Brand name of the product")
    discount: Optional[float] = Field(0.0, description="Discount percentage")
    rating: Optional[float] = Field(0.0, description="Product rating")
    variations: Optional[Dict[str, List[str]]] = Field(
        default=None, 
        description="e.g., {'sizes': ['S', 'M', 'L'], 'colors': ['Gold', 'Silver']}"
    )

class ProductCreate(ProductBase):
    category_id: Optional[int] = None
    subcategory_id: Optional[int] = None
    seller_id: Optional[int] = None

class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    category: Optional[str] = Field(None, min_length=1, max_length=50)
    category_id: Optional[int] = None
    subcategory_id: Optional[int] = None
    seller_id: Optional[int] = None
    price: Optional[float] = Field(None, gt=0)
    stock: Optional[int] = Field(None, ge=0)
    image_url: Optional[str] = None
    brand: Optional[str] = None
    discount: Optional[float] = None
    rating: Optional[float] = None
    variations: Optional[Dict[str, List[str]]] = None

class ProductResponse(ProductBase):
    id: int
    views: int = 0
    clicks: int = 0
    category_id: Optional[int] = None
    subcategory_id: Optional[int] = None
    seller_id: Optional[int] = None

    class Config:
        from_attributes = True

class InventoryLogResponse(BaseModel):
    id: int
    product_id: int
    change_amount: int
    reason: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True
