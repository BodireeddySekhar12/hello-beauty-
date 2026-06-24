from sqlalchemy import Column, Integer, String, Text, ForeignKey
from pydantic import BaseModel, Field
from typing import Optional
from database import Base

class DBCategory(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    icon = Column(String(100), nullable=True)

class DBSubcategory(Base):
    __tablename__ = "subcategories"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(50), index=True, nullable=False)
    description = Column(Text, nullable=True)

# Pydantic Schemas
class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = Field(None, max_length=1000)
    image_url: Optional[str] = Field(None, max_length=500)
    icon: Optional[str] = Field(None, max_length=100)

class CategoryResponse(CategoryCreate):
    id: int

    class Config:
        from_attributes = True

class SubcategoryCreate(BaseModel):
    category_id: int
    name: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = Field(None, max_length=1000)

class SubcategoryResponse(SubcategoryCreate):
    id: int

    class Config:
        from_attributes = True
