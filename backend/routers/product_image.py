from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import DBProductImage, ProductImageCreate, ProductImageResponse
from utils.auth import get_current_admin
from typing import List

router = APIRouter()

@router.post("/products/{product_id}/images", response_model=ProductImageResponse, status_code=status.HTTP_201_CREATED)
def add_product_image(
    product_id: int, 
    image: ProductImageCreate, 
    admin: str = Depends(get_current_admin), 
    db: Session = Depends(get_db)
):
    if product_id != image.product_id:
        raise HTTPException(status_code=400, detail="Product ID mismatch")
        
    db_img = DBProductImage(
        product_id=image.product_id,
        image_url=image.image_url,
        is_primary=image.is_primary
    )
    db.add(db_img)
    db.commit()
    db.refresh(db_img)
    return db_img

@router.get("/products/{product_id}/images", response_model=List[ProductImageResponse])
def get_product_images(product_id: int, db: Session = Depends(get_db)):
    return db.query(DBProductImage).filter(DBProductImage.product_id == product_id).all()

@router.delete("/product-images/{image_id}")
def delete_product_image(image_id: int, admin: str = Depends(get_current_admin), db: Session = Depends(get_db)):
    db_img = db.query(DBProductImage).filter(DBProductImage.id == image_id).first()
    if not db_img:
        raise HTTPException(status_code=404, detail="Product image not found")
        
    db.delete(db_img)
    db.commit()
    return {"status": "success", "detail": f"Product image {image_id} deleted"}
