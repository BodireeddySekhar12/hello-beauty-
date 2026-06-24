import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from database import get_db
from websocket_manager import manager
from models import (
    DBProduct, DBSellerProduct, DBInventoryLog, DBUser, DBRole, DBOrder,
    SellerCreate, SellerResponse, ProductCreate, ProductUpdate, ProductResponse, InventoryLogResponse
)
from utils.auth import oauth2_scheme, verify_token, get_current_admin
from typing import List
from pydantic import BaseModel

router = APIRouter()

# Dependency to verify the logged-in user is a SELLER
def get_current_seller(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> DBUser:
    payload = verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    username: str = payload.get("sub")
    user = db.query(DBUser).filter(
        (DBUser.username == username) | (DBUser.phone == username)
    ).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    role = db.query(DBRole).filter(DBRole.id == user.role_id).first()
    if not role or role.name != "SELLER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized as seller",
        )
    return user

# --- Admin CRUD Operations for Seller Profiles ---
@router.post("/sellers", response_model=SellerResponse, status_code=status.HTTP_201_CREATED)
def create_seller(seller: SellerCreate, admin: DBUser = Depends(get_current_admin), db: Session = Depends(get_db)):
    role = db.query(DBRole).filter(DBRole.name == "SELLER").first()
    if not role:
        raise HTTPException(status_code=500, detail="SELLER role not configured in database")

    # Check unique constraints
    if seller.phone:
        existing = db.query(DBUser).filter(DBUser.phone == seller.phone).first()
        if existing:
            raise HTTPException(status_code=400, detail="User with this phone number already exists")
    if seller.email:
        existing = db.query(DBUser).filter(DBUser.email == seller.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="User with this email already exists")

    db_seller = DBUser(
        name=seller.name,
        email=seller.email,
        phone=seller.phone,
        role_id=role.id
    )
    db.add(db_seller)
    db.commit()
    db.refresh(db_seller)
    return db_seller

@router.get("/sellers", response_model=List[SellerResponse])
def get_sellers(db: Session = Depends(get_db)):
    role = db.query(DBRole).filter(DBRole.name == "SELLER").first()
    if not role:
        return []
    return db.query(DBUser).filter(DBUser.role_id == role.id).all()

@router.get("/sellers/{seller_id}", response_model=SellerResponse)
def get_seller(seller_id: int, db: Session = Depends(get_db)):
    role = db.query(DBRole).filter(DBRole.name == "SELLER").first()
    if not role:
        raise HTTPException(status_code=404, detail="Seller not found")
        
    db_seller = db.query(DBUser).filter(DBUser.id == seller_id, DBUser.role_id == role.id).first()
    if not db_seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    return db_seller

@router.put("/sellers/{seller_id}", response_model=SellerResponse)
def update_seller(
    seller_id: int, 
    seller_data: SellerCreate, 
    admin: DBUser = Depends(get_current_admin), 
    db: Session = Depends(get_db)
):
    role = db.query(DBRole).filter(DBRole.name == "SELLER").first()
    if not role:
        raise HTTPException(status_code=404, detail="Seller not found")

    db_seller = db.query(DBUser).filter(DBUser.id == seller_id, DBUser.role_id == role.id).first()
    if not db_seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    
    db_seller.name = seller_data.name
    db_seller.email = seller_data.email
    db_seller.phone = seller_data.phone
    db.commit()
    db.refresh(db_seller)
    return db_seller

@router.delete("/sellers/{seller_id}")
def delete_seller(seller_id: int, admin: DBUser = Depends(get_current_admin), db: Session = Depends(get_db)):
    role = db.query(DBRole).filter(DBRole.name == "SELLER").first()
    if not role:
        raise HTTPException(status_code=404, detail="Seller not found")

    db_seller = db.query(DBUser).filter(DBUser.id == seller_id, DBUser.role_id == role.id).first()
    if not db_seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    
    db.delete(db_seller)
    db.commit()
    return {"status": "success", "detail": f"Seller {seller_id} deleted"}

# --- Seller Dashboard Console Operations ---

@router.get("/seller/products", response_model=List[ProductResponse])
def get_seller_products(seller: DBUser = Depends(get_current_seller), db: Session = Depends(get_db)):
    # Query products joined with seller_products mapping table
    products = db.query(DBProduct).join(
        DBSellerProduct, DBSellerProduct.product_id == DBProduct.id
    ).filter(DBSellerProduct.seller_id == seller.id).all()
    return products

@router.post("/seller/products", response_model=ProductResponse)
async def add_seller_product(
    product: ProductCreate, 
    seller: DBUser = Depends(get_current_seller), 
    db: Session = Depends(get_db)
):
    # Create product entry
    db_product = DBProduct(
        name=product.name,
        description=product.description,
        category=product.category,
        category_id=product.category_id,
        subcategory_id=product.subcategory_id,
        seller_id=seller.id,
        price=product.price,
        stock=product.stock,
        image_url=product.image_url,
        brand=product.brand,
        discount=product.discount,
        rating=product.rating,
        variations=product.variations,
        views=0,
        clicks=0
    )
    db.add(db_product)
    db.commit()
    db.refresh(db_product)

    # Create seller_products ownership link
    db_link = DBSellerProduct(seller_id=seller.id, product_id=db_product.id)
    db.add(db_link)

    # Create initial inventory log audit
    db_log = DBInventoryLog(
        product_id=db_product.id,
        change_amount=db_product.stock,
        reason="Initial stock creation by seller"
    )
    db.add(db_log)
    db.commit()

    # Broadcast new product via WebSocket
    await manager.broadcast({
        "event": "product_created",
        "product": {
            "id": db_product.id,
            "name": db_product.name,
            "description": db_product.description,
            "category": db_product.category,
            "category_id": db_product.category_id,
            "subcategory_id": db_product.subcategory_id,
            "seller_id": db_product.seller_id,
            "price": db_product.price,
            "stock": db_product.stock,
            "image_url": db_product.image_url,
            "brand": db_product.brand,
            "discount": db_product.discount,
            "rating": db_product.rating,
            "variations": db_product.variations,
            "views": db_product.views,
            "clicks": db_product.clicks
        }
    })

    return db_product

@router.put("/seller/products/{product_id}", response_model=ProductResponse)
async def update_seller_product(
    product_id: int, 
    product_data: ProductUpdate, 
    seller: DBUser = Depends(get_current_seller), 
    db: Session = Depends(get_db)
):
    # Verify seller owns this product
    link = db.query(DBSellerProduct).filter(
        DBSellerProduct.seller_id == seller.id,
        DBSellerProduct.product_id == product_id
    ).first()
    if not link:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not own this product"
        )

    product = db.query(DBProduct).filter(DBProduct.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    old_stock = product.stock

    # Update fields
    for key, value in product_data.dict(exclude_unset=True).items():
        setattr(product, key, value)
    
    db.commit()
    db.refresh(product)

    # Audit stock adjustments if stock levels change
    if product.stock != old_stock:
        diff = product.stock - old_stock
        db_log = DBInventoryLog(
            product_id=product.id,
            change_amount=diff,
            reason=f"Stock adjustment (update) by seller. Old: {old_stock}, New: {product.stock}"
        )
        db.add(db_log)
        db.commit()

    # Broadcast update via WebSocket
    await manager.broadcast({
        "event": "product_updated",
        "product_id": product.id,
        "name": product.name,
        "description": product.description,
        "category": product.category,
        "category_id": product.category_id,
        "subcategory_id": product.subcategory_id,
        "seller_id": product.seller_id,
        "price": product.price,
        "stock": product.stock,
        "image_url": product.image_url,
        "variations": product.variations
    })

    return product

@router.delete("/seller/products/{product_id}")
async def delete_seller_product(
    product_id: int, 
    seller: DBUser = Depends(get_current_seller), 
    db: Session = Depends(get_db)
):
    # Verify ownership
    link = db.query(DBSellerProduct).filter(
        DBSellerProduct.seller_id == seller.id,
        DBSellerProduct.product_id == product_id
    ).first()
    if not link:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not own this product"
        )

    product = db.query(DBProduct).filter(DBProduct.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Delete link and product
    db.delete(link)
    db.delete(product)
    db.commit()

    # Broadcast deletion via WebSocket
    await manager.broadcast({
        "event": "product_deleted",
        "product_id": product_id
    })

    return {"status": "success", "detail": f"Product {product_id} deleted"}

@router.get("/seller/inventory-logs", response_model=List[InventoryLogResponse])
def get_seller_inventory_logs(seller: DBUser = Depends(get_current_seller), db: Session = Depends(get_db)):
    # Query inventory logs for products owned by this seller
    logs = db.query(DBInventoryLog).join(
        DBSellerProduct, DBSellerProduct.product_id == DBInventoryLog.product_id
    ).filter(DBSellerProduct.seller_id == seller.id).order_by(DBInventoryLog.created_at.desc()).all()
    return logs

@router.post("/seller/upload")
async def seller_upload_file(
    file: UploadFile = File(...), 
    seller: DBUser = Depends(get_current_seller)
):
    # Sanitize file name
    file_name = file.filename.replace(" ", "_")
    file_path = os.path.join("uploads", file_name)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    serving_url = f"/uploads/{file_name}"
    return {"image_url": serving_url}

class StatusUpdate(BaseModel):
    status: str

@router.get("/seller/orders")
def get_seller_orders(seller: DBUser = Depends(get_current_seller), db: Session = Depends(get_db)):
    # Retrieve all orders for dashboard convenience
    orders = db.query(DBOrder).order_by(DBOrder.created_at.desc()).all()
    return orders

@router.put("/seller/orders/{order_id}/status")
def update_order_status(
    order_id: int,
    data: StatusUpdate,
    seller: DBUser = Depends(get_current_seller),
    db: Session = Depends(get_db)
):
    order = db.query(DBOrder).filter(DBOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    order.status = data.status
    db.commit()
    db.refresh(order)
    return {"status": "success", "order_id": order.id, "new_status": order.status}
