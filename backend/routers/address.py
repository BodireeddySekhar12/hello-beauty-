from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import DBAddress, AddressCreate, AddressResponse
from typing import List

router = APIRouter()

@router.post("/addresses", response_model=AddressResponse, status_code=status.HTTP_201_CREATED)
def create_address(address: AddressCreate, db: Session = Depends(get_db)):
    # If set as default, unset other default addresses for the same user
    if address.is_default:
        db.query(DBAddress).filter(
            DBAddress.user_id == address.user_id, 
            DBAddress.is_default == True
        ).update({"is_default": False})
        
    db_address = DBAddress(
        user_id=address.user_id,
        customer_name=address.customer_name,
        phone=address.phone,
        address_line=address.address_line,
        city=address.city,
        state=address.state,
        pincode=address.pincode,
        is_default=address.is_default
    )
    db.add(db_address)
    db.commit()
    db.refresh(db_address)
    return db_address

@router.get("/users/{user_id}/addresses", response_model=List[AddressResponse])
def get_user_addresses(user_id: int, db: Session = Depends(get_db)):
    return db.query(DBAddress).filter(DBAddress.user_id == user_id).all()

@router.put("/addresses/{address_id}", response_model=AddressResponse)
def update_address(address_id: int, address_data: AddressCreate, db: Session = Depends(get_db)):
    db_address = db.query(DBAddress).filter(DBAddress.id == address_id).first()
    if not db_address:
        raise HTTPException(status_code=404, detail="Address not found")
        
    if address_data.is_default:
        db.query(DBAddress).filter(
            DBAddress.user_id == db_address.user_id, 
            DBAddress.is_default == True
        ).update({"is_default": False})
        
    db_address.customer_name = address_data.customer_name
    db_address.phone = address_data.phone
    db_address.address_line = address_data.address_line
    db_address.city = address_data.city
    db_address.state = address_data.state
    db_address.pincode = address_data.pincode
    db_address.is_default = address_data.is_default
    
    db.commit()
    db.refresh(db_address)
    return db_address

@router.delete("/addresses/{address_id}")
def delete_address(address_id: int, db: Session = Depends(get_db)):
    db_address = db.query(DBAddress).filter(DBAddress.id == address_id).first()
    if not db_address:
        raise HTTPException(status_code=404, detail="Address not found")
        
    db.delete(db_address)
    db.commit()
    return {"status": "success", "detail": f"Address {address_id} deleted"}
