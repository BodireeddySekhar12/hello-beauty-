import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import DATABASE_URL

# SQLite-specific arguments (not needed for PostgreSQL)
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    # Import all models to register them on Base.metadata
    from models.role import DBRole
    from models.user import DBUser, DBOrder
    from models.category import DBCategory, DBSubcategory
    from models.product import DBProduct, DBSellerProduct, DBInventoryLog
    from models.product_image import DBProductImage
    from models.address import DBAddress
    Base.metadata.create_all(bind=engine)

    # SQLite dynamic migration script for brand, discount, and rating
    from sqlalchemy import text
    with engine.begin() as conn:
        res = conn.execute(text("PRAGMA table_info(products)"))
        columns = [row[1] for row in res.fetchall()]
        if "brand" not in columns:
            conn.execute(text("ALTER TABLE products ADD COLUMN brand VARCHAR(100)"))
        if "discount" not in columns:
            conn.execute(text("ALTER TABLE products ADD COLUMN discount FLOAT DEFAULT 0.0"))
        if "rating" not in columns:
            conn.execute(text("ALTER TABLE products ADD COLUMN rating FLOAT DEFAULT 0.0"))

        res_users = conn.execute(text("PRAGMA table_info(users)"))
        users_columns = [row[1] for row in res_users.fetchall()]
        if "profile_picture" not in users_columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN profile_picture VARCHAR(200)"))
        if "wishlist" not in users_columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN wishlist JSON"))
        if "is_active" not in users_columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 0"))
        if "email_verified" not in users_columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT 0"))
        if "phone_verified" not in users_columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN phone_verified BOOLEAN DEFAULT 0"))
        if "email_otp" not in users_columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN email_otp VARCHAR(20)"))
        if "phone_otp" not in users_columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN phone_otp VARCHAR(20)"))
        if "email_otp_expires_at" not in users_columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN email_otp_expires_at DATETIME"))
        if "phone_otp_expires_at" not in users_columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN phone_otp_expires_at DATETIME"))
        if "last_email_otp_sent_at" not in users_columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN last_email_otp_sent_at DATETIME"))
        if "last_phone_otp_sent_at" not in users_columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN last_phone_otp_sent_at DATETIME"))
