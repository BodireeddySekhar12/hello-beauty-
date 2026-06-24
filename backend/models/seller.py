import datetime
from pydantic import BaseModel, Field
from typing import Optional

class SellerCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)

class SellerResponse(SellerCreate):
    id: int
    created_at: datetime.datetime

    class Config:
        from_attributes = True
