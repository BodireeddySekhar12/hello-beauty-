from sqlalchemy import Column, Integer, String
from pydantic import BaseModel, Field
from database import Base

class DBRole(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, index=True, nullable=False)

class RoleCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)

class RoleResponse(RoleCreate):
    id: int

    class Config:
        from_attributes = True
