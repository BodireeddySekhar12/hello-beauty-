from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import DBCategory, CategoryCreate, CategoryResponse
from utils.auth import get_current_admin
from typing import List

router = APIRouter()

@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(category: CategoryCreate, admin: str = Depends(get_current_admin), db: Session = Depends(get_db)):
    # Check if category with name already exists
    existing = db.query(DBCategory).filter(DBCategory.name == category.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")
        
    db_category = DBCategory(
        name=category.name,
        description=category.description,
        image_url=category.image_url,
        icon=category.icon
    )
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

@router.get("/categories", response_model=List[CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    return db.query(DBCategory).all()

@router.get("/categories/{category_id}", response_model=CategoryResponse)
def get_category(category_id: int, db: Session = Depends(get_db)):
    db_category = db.query(DBCategory).filter(DBCategory.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    return db_category

@router.put("/categories/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: int,
    category_data: CategoryCreate,
    admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    db_category = db.query(DBCategory).filter(DBCategory.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
        
    db_category.name = category_data.name
    db_category.description = category_data.description
    db_category.image_url = category_data.image_url
    db_category.icon = category_data.icon
    db.commit()
    db.refresh(db_category)
    return db_category

@router.delete("/categories/{category_id}")
def delete_category(category_id: int, admin: str = Depends(get_current_admin), db: Session = Depends(get_db)):
    db_category = db.query(DBCategory).filter(DBCategory.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
        
    db.delete(db_category)
    db.commit()
    return {"status": "success", "detail": f"Category {category_id} deleted"}
