import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from database import get_db
from websocket_manager import manager
from models import (
    DBProduct, DBOrder, DBUser, DBRole, DBCategory, DBSubcategory,
    AdminLogin, TokenResponse, ProductCreate, ProductUpdate, ProductResponse
)
from utils.auth import create_access_token, get_current_admin, hash_password, verify_password
from config import ADMIN_USERNAME, ADMIN_PASSWORD

router = APIRouter()

# Create upload folder if not exists
os.makedirs("uploads", exist_ok=True)

@router.post("/auth/login", response_model=TokenResponse)
def login(admin_login: AdminLogin, db: Session = Depends(get_db)):
    # 1. Look up user in database
    user = db.query(DBUser).filter(DBUser.username == admin_login.username).first()
    if user:
        # Check role
        role = db.query(DBRole).filter(DBRole.id == user.role_id).first()
        if role and role.name in ["ADMIN", "SELLER"]:
            if verify_password(admin_login.password, user.password_hash):
                token = create_access_token(data={"sub": user.username, "role": role.name})
                return {"access_token": token, "token_type": "bearer", "role": role.name}

    # 2. Dynamic auto-seed fallback for setup convenience
    if admin_login.username == ADMIN_USERNAME and admin_login.password == ADMIN_PASSWORD:
        admin_role = db.query(DBRole).filter(DBRole.name == "ADMIN").first()
        if not admin_role:
            # Seed roles
            for r_name in ["ADMIN", "SELLER", "CUSTOMER"]:
                if not db.query(DBRole).filter(DBRole.name == r_name).first():
                    db.add(DBRole(name=r_name))
            db.commit()
            admin_role = db.query(DBRole).filter(DBRole.name == "ADMIN").first()

        if not user:
            user = DBUser(
                username=ADMIN_USERNAME,
                name="Store Administrator",
                password_hash=hash_password(ADMIN_PASSWORD),
                role_id=admin_role.id,
                is_active=True,
                email_verified=True,
                phone_verified=True
            )
            db.add(user)
            db.commit()

        token = create_access_token(data={"sub": ADMIN_USERNAME, "role": "ADMIN"})
        return {"access_token": token, "token_type": "bearer", "role": "ADMIN"}

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect username or password",
    )

@router.get("/admin/orders")
def get_orders(admin: DBUser = Depends(get_current_admin), db: Session = Depends(get_db)):
    orders = db.query(DBOrder).order_by(DBOrder.created_at.desc()).all()
    return orders

@router.get("/admin/users")
def get_users(admin: DBUser = Depends(get_current_admin), db: Session = Depends(get_db)):
    customer_role = db.query(DBRole).filter(DBRole.name == "CUSTOMER").first()
    if not customer_role:
        return []
    users = db.query(DBUser).filter(DBUser.role_id == customer_role.id).order_by(DBUser.created_at.desc()).all()
    return [
        {
            "id": u.id,
            "name": u.name,
            "phone": u.phone,
            "email": u.email,
            "is_active": u.is_active,
            "email_verified": u.email_verified,
            "phone_verified": u.phone_verified,
            "created_at": u.created_at
        }
        for u in users
    ]

@router.delete("/admin/users/{user_id}")
def delete_user(user_id: int, admin: DBUser = Depends(get_current_admin), db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found")
        
    if user.username == admin.username:
        raise HTTPException(status_code=400, detail="Cannot delete your own administrator account")
        
    # Dissociate orders
    db.query(DBOrder).filter(DBOrder.user_id == user_id).update({DBOrder.user_id: None})
    
    # Delete user
    db.delete(user)
    db.commit()
    return {"status": "success", "detail": "User account deleted successfully"}

@router.post("/admin/products", response_model=ProductResponse)
async def add_product(
    product: ProductCreate, 
    admin: DBUser = Depends(get_current_admin), 
    db: Session = Depends(get_db)
):
    db_product = DBProduct(
        name=product.name,
        description=product.description,
        category=product.category,
        category_id=product.category_id,
        subcategory_id=product.subcategory_id,
        seller_id=product.seller_id,
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
    
    # Broadcast new product addition
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

@router.put("/admin/products/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int, 
    product_data: ProductUpdate, 
    admin: DBUser = Depends(get_current_admin), 
    db: Session = Depends(get_db)
):
    product = db.query(DBProduct).filter(DBProduct.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Update fields
    for key, value in product_data.dict(exclude_unset=True).items():
        setattr(product, key, value)
        
    db.commit()
    db.refresh(product)
    
    # Broadcast update to all connected clients
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

@router.delete("/admin/products/{product_id}")
async def delete_product(
    product_id: int, 
    admin: DBUser = Depends(get_current_admin), 
    db: Session = Depends(get_db)
):
    product = db.query(DBProduct).filter(DBProduct.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    db.delete(product)
    db.commit()
    
    # Broadcast deletion to all connected clients
    await manager.broadcast({
        "event": "product_deleted",
        "product_id": product_id
    })
    
    return {"status": "success", "detail": f"Product {product_id} deleted"}

@router.post("/admin/upload")
async def upload_file(
    file: UploadFile = File(...), 
    admin: DBUser = Depends(get_current_admin)
):
    # Sanitize file name
    file_name = file.filename.replace(" ", "_")
    file_path = os.path.join("uploads", file_name)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Generate serving path
    serving_url = f"/uploads/{file_name}"
    return {"image_url": serving_url}

@router.post("/admin/seed")
def seed_database(db: Session = Depends(get_db)):
    # 1. Seed Roles
    roles_map = {}
    for r_name in ["ADMIN", "SELLER", "CUSTOMER"]:
        role = db.query(DBRole).filter(DBRole.name == r_name).first()
        if not role:
            role = DBRole(name=r_name)
            db.add(role)
            db.commit()
            db.refresh(role)
        roles_map[r_name] = role.id

    # 2. Seed Default Admin User
    admin_user = db.query(DBUser).filter(DBUser.username == ADMIN_USERNAME).first()
    if not admin_user:
        admin_user = DBUser(
            username=ADMIN_USERNAME,
            name="Store Administrator",
            password_hash=hash_password(ADMIN_PASSWORD),
            role_id=roles_map["ADMIN"],
            is_active=True,
            email_verified=True,
            phone_verified=True
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

    # 3. Seed Default Seller User
    seller_user = db.query(DBUser).filter(DBUser.username == "seller").first()
    if not seller_user:
        seller_user = DBUser(
            username="seller",
            name="Premium Beauty Merchant",
            password_hash=hash_password("seller123"),
            role_id=roles_map["SELLER"],
            is_active=True,
            email_verified=True,
            phone_verified=True
        )
        db.add(seller_user)
        db.commit()
        db.refresh(seller_user)

    # 4. Seed Categories and Subcategories
    # 4. Seed Categories and Subcategories
    db.query(DBProduct).delete()
    db.query(DBSubcategory).delete()
    db.query(DBCategory).delete()
    db.commit()

    categories_def = {
        "Jewelry": {
            "description": "Minimalist and luxury gold & silver jewelry.",
            "image_url": None,
            "icon": "chain",
            "subcategories": ["Gold Chains", "Silver Chains", "Rings"]
        },
        "Dresses": {
            "description": "Elegant apparel and kurti designs.",
            "image_url": None,
            "icon": "apparel",
            "subcategories": ["Kurtis", "Dresses", "Gowns"]
        },
        "Makeup": {
            "description": "High-pigment and long-wearing cosmetics.",
            "image_url": None,
            "icon": "cosmetics",
            "subcategories": ["Lipsticks", "Highlighters", "Foundations"]
        },
        "Handbags": {
            "description": "Premium leather and party bags.",
            "image_url": None,
            "icon": "handbag",
            "subcategories": ["Totes", "Sling Bags", "Clutches"]
        },
        "Footwear": {
            "description": "Elegant party stilettos and flats.",
            "image_url": None,
            "icon": "footwear",
            "subcategories": ["Heels", "Flats"]
        },
        "Skincare": {
            "description": "Nourishing serums and glow moisturizers.",
            "image_url": None,
            "icon": "skincare",
            "subcategories": ["Serums", "Moisturizers", "Jelly"]
        }
    }

    cat_map = {}
    subcat_map = {}

    for c_name, c_info in categories_def.items():
        cat = DBCategory(
            name=c_name,
            description=c_info["description"],
            image_url=c_info["image_url"],
            icon=c_info["icon"]
        )
        db.add(cat)
        db.commit()
        db.refresh(cat)
        cat_map[c_name] = cat.id

        for sub_name in c_info["subcategories"]:
            subcat = DBSubcategory(
                category_id=cat.id,
                name=sub_name,
                description=f"Premium selections of {sub_name}"
            )
            db.add(subcat)
            db.commit()
            db.refresh(subcat)
            subcat_map[sub_name] = subcat.id

    # 5. Seed Products
    initial_products = [
        # --- Jewelry ---
        DBProduct(
            name="Aura Gold Chain",
            description="Elegant 18K gold-plated double loop chain, perfect for minimalist wear or layering.",
            category="Jewelry",
            category_id=cat_map["Jewelry"],
            subcategory_id=subcat_map["Gold Chains"],
            seller_id=seller_user.id,
            price=4999.00,
            stock=12,
            image_url="https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=600",
            brand="Aura Premium",
            discount=15.0,
            rating=4.8,
            variations={"lengths": ["16 inch", "18 inch", "20 inch"], "colors": ["Gold", "Silver"]},
            views=240,
            clicks=88
        ),
        DBProduct(
            name="Satin Gold Choker",
            description="Champagne gold mesh choker with premium lobster clasp adjustment.",
            category="Jewelry",
            category_id=cat_map["Jewelry"],
            subcategory_id=subcat_map["Gold Chains"],
            seller_id=seller_user.id,
            price=3200.00,
            stock=8,
            image_url="https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?auto=format&fit=crop&q=80&w=600",
            brand="Aura Premium",
            discount=0.0,
            rating=4.5,
            variations={"lengths": ["14 inch", "16 inch"], "colors": ["Gold", "Rose Gold"]},
            views=152,
            clicks=45
        ),
        DBProduct(
            name="Diamond Solitaire Ring",
            description="Classic prong-set simulated diamond solitaire ring in sterling silver band.",
            category="Jewelry",
            category_id=cat_map["Jewelry"],
            subcategory_id=subcat_map["Rings"],
            seller_id=seller_user.id,
            price=29999.00,
            stock=4,
            image_url="https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&q=80&w=600",
            brand="Aura Premium",
            discount=5.0,
            rating=4.9,
            variations={"sizes": ["6", "7", "8"], "colors": ["Platinum", "Gold"]},
            views=380,
            clicks=140
        ),
        DBProduct(
            name="Silver Pearl Earrings",
            description="Exquisite freshwater cultured pearls set in high-polish 925 sterling silver studs.",
            category="Jewelry",
            category_id=cat_map["Jewelry"],
            subcategory_id=subcat_map["Silver Chains"],
            seller_id=seller_user.id,
            price=1800.00,
            stock=15,
            image_url="https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80&w=600",
            brand="Aura Premium",
            discount=10.0,
            rating=4.6,
            variations={"colors": ["White Pearl", "Pink Pearl"]},
            views=95,
            clicks=32
        ),

        # --- Dresses ---
        DBProduct(
            name="Crimson Velvet Kurti",
            description="Crafted from premium velvet, featuring exquisite hand embroidery along the neckline and cuffs.",
            category="Dresses",
            category_id=cat_map["Dresses"],
            subcategory_id=subcat_map["Kurtis"],
            seller_id=seller_user.id,
            price=8500.00,
            stock=5,
            image_url="https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=600",
            brand="Kora Craft",
            discount=10.0,
            rating=4.9,
            variations={"sizes": ["S", "M", "L", "XL"], "colors": ["Crimson Red", "Burgundy"]},
            views=410,
            clicks=167
        ),
        DBProduct(
            name="Pastel Rose Dress",
            description="Light, breezy Georgette summer dress in soft blush rose pink color with ruffled bottom.",
            category="Dresses",
            category_id=cat_map["Dresses"],
            subcategory_id=subcat_map["Dresses"],
            seller_id=seller_user.id,
            price=5200.00,
            stock=15,
            image_url="https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&q=80&w=600",
            brand="Kora Craft",
            discount=20.0,
            rating=4.2,
            variations={"sizes": ["XS", "S", "M", "L"], "colors": ["Pastel Pink", "Soft Rose"]},
            views=315,
            clicks=110
        ),
        DBProduct(
            name="Elegant Evening Gown",
            description="Floor-length satin evening gown with a thigh-high slit and off-the-shoulder straps.",
            category="Dresses",
            category_id=cat_map["Dresses"],
            subcategory_id=subcat_map["Gowns"],
            seller_id=seller_user.id,
            price=12500.00,
            stock=3,
            image_url="https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&q=80&w=600",
            brand="Kora Craft",
            discount=15.0,
            rating=4.8,
            variations={"sizes": ["S", "M", "L"], "colors": ["Emerald Green", "Midnight Blue", "Black"]},
            views=250,
            clicks=95
        ),
        DBProduct(
            name="Floral Summer Maxi",
            description="Charming floral print maxi dress in breathable cotton with smocked bodice.",
            category="Dresses",
            category_id=cat_map["Dresses"],
            subcategory_id=subcat_map["Dresses"],
            seller_id=seller_user.id,
            price=2900.00,
            stock=20,
            image_url="https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&q=80&w=600",
            brand="Kora Craft",
            discount=10.0,
            rating=4.3,
            variations={"sizes": ["S", "M", "L", "XL"], "colors": ["Daisy Yellow", "Sky Blue"]},
            views=180,
            clicks=60
        ),

        # --- Makeup ---
        DBProduct(
            name="Royal Matte Rouge",
            description="Long-lasting hydrating matte lipstick in our signature deep red, smudge-proof up to 12 hours.",
            category="Makeup",
            category_id=cat_map["Makeup"],
            subcategory_id=subcat_map["Lipsticks"],
            seller_id=seller_user.id,
            price=1499.00,
            stock=25,
            image_url="https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&q=80&w=600",
            brand="Glow Glow",
            discount=5.0,
            rating=4.6,
            variations={"shades": ["Ruby Red", "Crimson", "Deep Garnet"], "colors": ["Matte Red", "Glossy Red"]},
            views=198,
            clicks=62
        ),
        DBProduct(
            name="Glow Aura Highlighter",
            description="Ultra-fine powder highlighter with light-reflective pearls for a natural champagne-gold glow.",
            category="Makeup",
            category_id=cat_map["Makeup"],
            subcategory_id=subcat_map["Highlighters"],
            seller_id=seller_user.id,
            price=2100.00,
            stock=18,
            image_url="https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=600",
            brand="Glow Glow",
            discount=0.0,
            rating=4.7,
            variations={"shades": ["Champagne Glow", "Rose Gold Glow"], "colors": ["Champagne", "Rose Gold"]},
            views=220,
            clicks=95
        ),
        DBProduct(
            name="Lakme Absolute Liquid Lip",
            description="Intense color payoff with a lightweight matte finish, infused with argan oil hydration.",
            category="Makeup",
            category_id=cat_map["Makeup"],
            subcategory_id=subcat_map["Lipsticks"],
            seller_id=seller_user.id,
            price=850.00,
            stock=30,
            image_url="https://images.unsplash.com/photo-1625093742435-6fa192b6fb10?auto=format&fit=crop&q=80&w=600",
            brand="Lakme",
            discount=10.0,
            rating=4.5,
            variations={"shades": ["Pink Glam", "Mild Coral", "Brick Red"]},
            views=160,
            clicks=70
        ),
        DBProduct(
            name="Maybelline Fit Me Foundation",
            description="Mattifying liquid foundation that refines pores and leaves a natural, seamless finish.",
            category="Makeup",
            category_id=cat_map["Makeup"],
            subcategory_id=subcat_map["Foundations"],
            seller_id=seller_user.id,
            price=699.00,
            stock=45,
            image_url="https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=600",
            brand="Maybelline",
            discount=15.0,
            rating=4.4,
            variations={"shades": ["115 Ivory", "128 Warm Nude", "220 Natural Beige"]},
            views=340,
            clicks=112
        ),

        # --- Handbags ---
        DBProduct(
            name="Premium Leather Tote",
            description="Spacious structured tote handcrafted from full-grain leather, featuring a padded laptop compartment.",
            category="Handbags",
            category_id=cat_map["Handbags"],
            subcategory_id=subcat_map["Totes"],
            seller_id=seller_user.id,
            price=4500.00,
            stock=10,
            image_url="https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&q=80&w=600",
            brand="Mamaearth",
            discount=12.0,
            rating=4.5,
            variations={"colors": ["Tan Leather", "Noir Black", "Olive"]},
            views=145,
            clicks=40
        ),
        DBProduct(
            name="Classic Quilted Sling Bag",
            description="Chic chain strap sling bag with a chevron quilted design and gold-tone turnlock closure.",
            category="Handbags",
            category_id=cat_map["Handbags"],
            subcategory_id=subcat_map["Sling Bags"],
            seller_id=seller_user.id,
            price=2800.00,
            stock=14,
            image_url="https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&q=80&w=600",
            brand="Mamaearth",
            discount=15.0,
            rating=4.6,
            variations={"colors": ["Blush Pink", "Snow White", "Crimson"]},
            views=210,
            clicks=78
        ),
        DBProduct(
            name="Golden Party Clutch",
            description="Stunning metallic clutch encrusted with shimmer crystals, ideal for weddings and gala events.",
            category="Handbags",
            category_id=cat_map["Handbags"],
            subcategory_id=subcat_map["Clutches"],
            seller_id=seller_user.id,
            price=1999.00,
            stock=8,
            image_url="https://images.unsplash.com/photo-1566150905458-1bf1fc15a4a5?auto=format&fit=crop&q=80&w=600",
            brand="Mamaearth",
            discount=20.0,
            rating=4.7,
            variations={"colors": ["Gold", "Champagne", "Silver"]},
            views=130,
            clicks=55
        ),

        # --- Footwear ---
        DBProduct(
            name="Velvet Party Stiletto",
            description="Exquisite pointed-toe stiletto pumps in velvet lining with cushioned memory foam insoles.",
            category="Footwear",
            category_id=cat_map["Footwear"],
            subcategory_id=subcat_map["Heels"],
            seller_id=seller_user.id,
            price=3500.00,
            stock=12,
            image_url="https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&q=80&w=600",
            brand="Sugar",
            discount=10.0,
            rating=4.7,
            variations={"sizes": ["6", "7", "8", "9"], "colors": ["Burgundy Velvet", "Royal Black"]},
            views=172,
            clicks=53
        ),
        DBProduct(
            name="Casual Gold Slip-ons",
            description="Lightweight and comfortable mesh flats with subtle gold glitter weave for daily wear.",
            category="Footwear",
            category_id=cat_map["Footwear"],
            subcategory_id=subcat_map["Flats"],
            seller_id=seller_user.id,
            price=1800.00,
            stock=16,
            image_url="https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&q=80&w=600",
            brand="Sugar",
            discount=15.0,
            rating=4.4,
            variations={"sizes": ["5", "6", "7", "8"], "colors": ["Glitter Gold", "Silver Sparkle"]},
            views=225,
            clicks=89
        ),
        DBProduct(
            name="Elegant Leather Flats",
            description="Sophisticated pointed flat slides made of soft vegan leather, ideal for corporate or casual wear.",
            category="Footwear",
            category_id=cat_map["Footwear"],
            subcategory_id=subcat_map["Flats"],
            seller_id=seller_user.id,
            price=2200.00,
            stock=10,
            image_url="https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&q=80&w=600",
            brand="Sugar",
            discount=5.0,
            rating=4.5,
            variations={"sizes": ["6", "7", "8"], "colors": ["Tan Leather", "Nude Beige"]},
            views=140,
            clicks=42
        ),

        # --- Skincare ---
        DBProduct(
            name="Mamaearth Vitamin C Serum",
            description="Glow serum with Vitamin C and Gotu Kola to fight hyperpigmentation and restore natural radiance.",
            category="Skincare",
            category_id=cat_map["Skincare"],
            subcategory_id=subcat_map["Serums"],
            seller_id=seller_user.id,
            price=599.00,
            stock=40,
            image_url="https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=600",
            brand="Mamaearth",
            discount=10.0,
            rating=4.6,
            variations={"sizes": ["30 ml", "50 ml"]},
            views=290,
            clicks=110
        ),
        DBProduct(
            name="Sugar Aquaholic Water Jelly",
            description="Ultra-light hydrating gel moisturizer that locks in moisture for a plump, fresh face look.",
            category="Skincare",
            category_id=cat_map["Skincare"],
            subcategory_id=subcat_map["Jelly"],
            seller_id=seller_user.id,
            price=499.00,
            stock=35,
            image_url="https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&q=80&w=600",
            brand="Sugar",
            discount=8.0,
            rating=4.5,
            variations={"sizes": ["50 g", "100 g"]},
            views=198,
            clicks=68
        ),
        DBProduct(
            name="Hydra-Glow Face Cream",
            description="Nourishing overnight recovery cream packed with hyaluronic acid and rose extract.",
            category="Skincare",
            category_id=cat_map["Skincare"],
            subcategory_id=subcat_map["Moisturizers"],
            seller_id=seller_user.id,
            price=799.00,
            stock=22,
            image_url="https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=600",
            brand="Glow Glow",
            discount=12.0,
            rating=4.3,
            variations={"sizes": ["50 ml", "75 ml"]},
            views=150,
            clicks=52
        )
    ]
    db.add_all(initial_products)
    db.commit()
    return {"status": "seeded", "count": len(initial_products)}
