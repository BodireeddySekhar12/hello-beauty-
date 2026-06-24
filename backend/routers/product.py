from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from websocket_manager import manager
from models import DBProduct, ProductResponse
from typing import List

router = APIRouter()

@router.get("/products", response_model=List[ProductResponse])
def get_products(db: Session = Depends(get_db)):
    products = db.query(DBProduct).all()
    return products

@router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(DBProduct).filter(DBProduct.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Increment view counter
    product.views += 1
    db.commit()
    db.refresh(product)
    
    # Broadcast viewing update
    await manager.broadcast({
        "event": "product_viewed",
        "product_id": product.id,
        "views": product.views
    })
    
    return product

@router.post("/products/{product_id}/click")
async def register_click(product_id: int, db: Session = Depends(get_db)):
    product = db.query(DBProduct).filter(DBProduct.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Increment click counter
    product.clicks += 1
    db.commit()
    db.refresh(product)
    
    # Broadcast click update
    await manager.broadcast({
        "event": "product_clicked",
        "product_id": product.id,
        "clicks": product.clicks
    })
    
    return {"status": "success", "clicks": product.clicks}
