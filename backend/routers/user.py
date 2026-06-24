from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from database import get_db
from websocket_manager import manager
from models import (
    DBProduct, DBOrder, DBUser, DBRole,
    OrderCreate, OrderResponse, UserCreate, UserResponse,
    CustomerRegister, CustomerLogin, PasswordChange, PasswordReset, UserProfileUpdate,
    VerifyEmailRequest, VerifyPhoneRequest, ResendEmailRequest, ResendPhoneRequest
)
from utils.whatsapp import assemble_whatsapp_receipt, get_whatsapp_url
from utils.auth import hash_password, verify_password, create_access_token, verify_token, oauth2_scheme
from utils.notifier import send_email_otp, send_sms_otp
from typing import List, Optional
from config import MOCK_OTP

router = APIRouter()

def get_customer_role_id(db: Session) -> int:
    role = db.query(DBRole).filter(DBRole.name == "CUSTOMER").first()
    if not role:
        # Seed default roles if they aren't seeded yet
        for r_name in ["ADMIN", "SELLER", "CUSTOMER"]:
            if not db.query(DBRole).filter(DBRole.name == r_name).first():
                db.add(DBRole(name=r_name))
        db.commit()
        role = db.query(DBRole).filter(DBRole.name == "CUSTOMER").first()
    return role.id

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> DBUser:
    payload = verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    username = payload.get("sub")
    user = db.query(DBUser).filter((DBUser.username == username) | (DBUser.phone == username) | (DBUser.email == username)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user

@router.post("/orders")
async def create_order(
    order_data: OrderCreate, 
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None)
):
    # Find or associate user
    db_user = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        payload = verify_token(token)
        if payload:
            username = payload.get("sub")
            db_user = db.query(DBUser).filter(
                (DBUser.phone == username) | (DBUser.email == username)
            ).first()

    if not db_user:
        db_user = db.query(DBUser).filter(DBUser.phone == order_data.phone).first()
        if not db_user:
            role_id = get_customer_role_id(db)
            db_user = DBUser(phone=order_data.phone, name=order_data.customer_name, role_id=role_id, wishlist=[])
            db.add(db_user)
            db.commit()
            db.refresh(db_user)

    # Verify stock availability for items
    db_items = []
    for item in order_data.items:
        product = db.query(DBProduct).filter(DBProduct.id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=400, detail=f"Product {item.name} not found")
        if product.stock < item.quantity:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient stock for {item.name}. Available: {product.stock}"
            )
        
        # Deduct stock
        product.stock -= item.quantity
        db_items.append((product, item.quantity))
    
    # Calculate coupon discount
    discount_pct = 0.0
    if order_data.coupon_code:
        code = order_data.coupon_code.upper().strip()
        if code == "WELCOME10":
            discount_pct = 10.0
        elif code == "BEAUTY15":
            discount_pct = 15.0
        elif code == "FIRST20":
            discount_pct = 20.0

    calculated_subtotal = sum(item.price * item.quantity for item in order_data.items)
    discounted_total = calculated_subtotal * (1 - discount_pct / 100)

    # Create order record
    serialized_items = [item.dict() for item in order_data.items]
    db_order = DBOrder(
        customer_name=order_data.customer_name,
        phone=order_data.phone,
        address=order_data.address,
        items=serialized_items,
        total_price=discounted_total,
        user_id=db_user.id
    )
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    
    # Save stock updates
    db.commit()
    
    # Broadcast stock updates to all connected clients
    for prod, _ in db_items:
        await manager.broadcast({
            "event": "product_updated",
            "product_id": prod.id,
            "stock": prod.stock
        })
    
    # Format and generate WhatsApp URL
    receipt_text = assemble_whatsapp_receipt(
        order_id=db_order.id,
        customer_name=db_order.customer_name,
        phone=db_order.phone,
        address=db_order.address,
        items=serialized_items,
        total_price=db_order.total_price
    )
    
    whatsapp_url = get_whatsapp_url(receipt_text)
    
    return {
        "order_id": db_order.id,
        "whatsapp_url": whatsapp_url,
        "status": "created"
    }

@router.post("/users", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(DBUser).filter(DBUser.phone == user.phone).first()
    if db_user:
        # Update name if provided
        if user.name:
            db_user.name = user.name
            db.commit()
            db.refresh(db_user)
        return db_user
    
    role_id = user.role_id if user.role_id else get_customer_role_id(db)
    new_user = DBUser(phone=user.phone, name=user.name, role_id=role_id, wishlist=[])
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.get("/users/{phone}/orders")
def get_user_orders(phone: str, db: Session = Depends(get_db)):
    orders = db.query(DBOrder).filter(DBOrder.phone == phone).order_by(DBOrder.created_at.desc()).all()
    return orders

# --- Customer Authentication & Registration Endpoints ---

@router.post("/customer/register")
def register_customer(reg: CustomerRegister, db: Session = Depends(get_db)):
    existing_phone = db.query(DBUser).filter(DBUser.phone == reg.phone).first()
    if existing_phone:
        raise HTTPException(status_code=400, detail="Mobile number is already registered")
        
    existing_email = db.query(DBUser).filter(DBUser.email == reg.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email address is already registered")

    role_id = get_customer_role_id(db)

    new_user = DBUser(
        name=reg.name,
        phone=reg.phone,
        email=reg.email,
        username=reg.email,
        password_hash=hash_password(reg.password),
        role_id=role_id,
        wishlist=[],
        is_active=True,         # Auto-activate immediately
        email_verified=True,    # Auto-verify email
        phone_verified=True,    # Auto-verify phone
        email_otp=None,
        phone_otp=None,
        email_otp_expires_at=None,
        phone_otp_expires_at=None,
        last_email_otp_sent_at=None,
        last_phone_otp_sent_at=None
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    print(f"[REGISTRATION SUCCESS] User: {new_user.email}, Phone: {new_user.phone}")
    
    return {
        "status": "success", 
        "detail": "Registration completed successfully. You can now log in."
    }

@router.post("/customer/login")
def login_customer(login_data: CustomerLogin, db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(
        (DBUser.phone == login_data.username) | (DBUser.email == login_data.username)
    ).first()
    
    if not user or not user.password_hash or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect credentials")

    # Auto-verify email and phone for backward compatibility with older unverified accounts
    if not user.email_verified or not user.phone_verified or not user.is_active:
        user.email_verified = True
        user.phone_verified = True
        user.is_active = True
        db.commit()
        db.refresh(user)

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated."
        )
        
    role = db.query(DBRole).filter(DBRole.id == user.role_id).first()
    role_name = role.name if role else "CUSTOMER"
    
    token = create_access_token(data={"sub": user.phone, "role": role_name})
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": role_name,
        "user": {
            "id": user.id,
            "name": user.name,
            "phone": user.phone,
            "email": user.email,
            "profile_picture": user.profile_picture,
            "wishlist": user.wishlist or []
        }
    }

@router.get("/customer/profile", response_model=UserResponse)
def get_customer_profile(current_user: DBUser = Depends(get_current_user)):
    return current_user

@router.put("/customer/profile", response_model=UserResponse)
def update_customer_profile(
    profile_data: UserProfileUpdate, 
    current_user: DBUser = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    if profile_data.name is not None:
        current_user.name = profile_data.name
    if profile_data.email is not None:
        if profile_data.email != current_user.email:
            existing = db.query(DBUser).filter(DBUser.email == profile_data.email).first()
            if existing:
                raise HTTPException(status_code=400, detail="Email address is already in use")
        current_user.email = profile_data.email
    if profile_data.phone is not None:
        if profile_data.phone != current_user.phone:
            existing = db.query(DBUser).filter(DBUser.phone == profile_data.phone).first()
            if existing:
                raise HTTPException(status_code=400, detail="Mobile number is already in use")
        current_user.phone = profile_data.phone
    if profile_data.profile_picture is not None:
        current_user.profile_picture = profile_data.profile_picture
        
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/customer/change-password")
def change_customer_password(
    data: PasswordChange, 
    current_user: DBUser = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    if not current_user.password_hash or not verify_password(data.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect old password")
        
    current_user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"status": "success", "detail": "Password updated successfully"}

@router.post("/customer/reset-password")
def reset_customer_password(data: PasswordReset, db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(
        DBUser.phone == data.phone,
        DBUser.email == data.email
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="No matching user account found with those details")
        
    user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"status": "success", "detail": "Password reset completed successfully"}

@router.put("/customer/wishlist")
def update_customer_wishlist(
    product_ids: List[int],
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    current_user.wishlist = product_ids
    db.commit()
    db.refresh(current_user)
    return {"status": "success", "wishlist": current_user.wishlist or []}

@router.get("/customer/orders")
def get_customer_orders(
    current_user: DBUser = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    orders = db.query(DBOrder).filter(DBOrder.user_id == current_user.id).order_by(DBOrder.created_at.desc()).all()
    return orders

@router.post("/customer/verify/email")
def verify_email(data: VerifyEmailRequest, db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.email_verified:
        return {"status": "success", "message": "Email is already verified"}
        
    if not user.email_otp or user.email_otp != data.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP code")
        
    import datetime
    if not user.email_otp_expires_at or user.email_otp_expires_at < datetime.datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP code has expired")
        
    user.email_verified = True
    user.email_otp = None
    user.email_otp_expires_at = None
    
    # Check if both are now verified to activate the account
    if user.phone_verified:
        user.is_active = True
        
    db.commit()
    return {
        "status": "success", 
        "message": "Email verified successfully",
        "is_active": user.is_active
    }

@router.post("/customer/verify/phone")
def verify_phone(data: VerifyPhoneRequest, db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.phone == data.phone).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.phone_verified:
        return {"status": "success", "message": "Phone number is already verified"}
        
    if not user.phone_otp or user.phone_otp != data.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP code")
        
    import datetime
    if not user.phone_otp_expires_at or user.phone_otp_expires_at < datetime.datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP code has expired")
        
    user.phone_verified = True
    user.phone_otp = None
    user.phone_otp_expires_at = None
    
    # Check if both are now verified to activate the account
    if user.email_verified:
        user.is_active = True
        
    db.commit()
    return {
        "status": "success", 
        "message": "Phone number verified successfully",
        "is_active": user.is_active
    }

@router.post("/customer/resend/email")
def resend_email_otp(data: ResendEmailRequest, db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.email_verified:
        raise HTTPException(status_code=400, detail="Email is already verified")
        
    import datetime
    import random
    now = datetime.datetime.utcnow()
    
    # Cooldown check: 60 seconds
    if user.last_email_otp_sent_at:
        elapsed = (now - user.last_email_otp_sent_at).total_seconds()
        if elapsed < 60:
            retry_after = int(60 - elapsed)
            raise HTTPException(
                status_code=429, 
                detail=f"Please wait {retry_after} seconds before requesting a new OTP."
            )
            
    # Generate new OTP
    otp = f"{random.randint(100000, 999999)}"
    
    # Attempt email delivery first
    try:
        send_email_otp(user.email, otp)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Email delivery failed: {str(e)}"
        )

    user.email_otp = otp
    user.email_otp_expires_at = now + datetime.timedelta(minutes=10)
    user.last_email_otp_sent_at = now
    
    db.commit()
    
    print(f"[EMAIL OTP RESEND] User: {user.email}, Code: {otp}")
    
    return {"status": "success", "message": "Verification email sent"}

@router.post("/customer/resend/phone")
def resend_phone_otp(data: ResendPhoneRequest, db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.phone == data.phone).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.phone_verified:
        raise HTTPException(status_code=400, detail="Phone number is already verified")
        
    import datetime
    import random
    now = datetime.datetime.utcnow()
    
    # Cooldown check: 60 seconds
    if user.last_phone_otp_sent_at:
        elapsed = (now - user.last_phone_otp_sent_at).total_seconds()
        if elapsed < 60:
            retry_after = int(60 - elapsed)
            raise HTTPException(
                status_code=429, 
                detail=f"Please wait {retry_after} seconds before requesting a new OTP."
            )
            
    # Generate new OTP
    otp = f"{random.randint(100000, 999999)}"
    
    # Attempt SMS delivery first
    try:
        send_sms_otp(user.phone, otp)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"SMS delivery failed: {str(e)}"
        )

    user.phone_otp = otp
    user.phone_otp_expires_at = now + datetime.timedelta(minutes=10)
    user.last_phone_otp_sent_at = now
    
    db.commit()
    
    print(f"[PHONE OTP RESEND] User: {user.phone}, Code: {otp}")
    
    res_msg = "Verification SMS sent"
    if MOCK_OTP:
        res_msg += f" [MOCK OTP: {otp}]"
        
    return {
        "status": "success", 
        "message": res_msg,
        "mock_otp": otp if MOCK_OTP else None
    }

