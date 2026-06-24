from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from pydantic import BaseModel, Field
from database import Base

class DBAddress(Base):
    __tablename__ = "addresses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    customer_name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=False)
    address_line = Column(String(200), nullable=False)
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    pincode = Column(String(10), nullable=False)
    is_default = Column(Boolean, default=False)

class AddressCreate(BaseModel):
    user_id: int
    customer_name: str = Field(..., min_length=1, max_length=100)
    phone: str = Field(..., min_length=10, max_length=15)
    address_line: str = Field(..., min_length=5, max_length=200)
    city: str = Field(..., min_length=2, max_length=100)
    state: str = Field(..., min_length=2, max_length=100)
    pincode: str = Field(..., min_length=6, max_length=10)
    is_default: bool = False

class AddressResponse(AddressCreate):
    id: int

    class Config:
        from_attributes = True
