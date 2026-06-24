from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from pydantic import BaseModel
from database import Base

class DBProductImage(Base):
    __tablename__ = "product_images"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    image_url = Column(String(500), nullable=False)
    is_primary = Column(Boolean, default=False)

class ProductImageCreate(BaseModel):
    product_id: int
    image_url: str
    is_primary: bool = False

class ProductImageResponse(ProductImageCreate):
    id: int

    class Config:
        from_attributes = True
