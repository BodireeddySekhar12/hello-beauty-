import datetime
import urllib.parse
from typing import List, Dict, Any
from config import WHATSAPP_PHONE

def datetime_str() -> str:
    return datetime.datetime.now().strftime("%Y-%m-%d %I:%M %p")

def assemble_whatsapp_receipt(
    order_id: int, 
    customer_name: str, 
    phone: str, 
    address: str, 
    items: List[Dict[str, Any]], 
    total_price: float
) -> str:
    """
    Formats order selections and customer details into an elegant, readable text receipt
    leveraging WhatsApp's bold (*text*) and italic (_text_) markdown.
    """
    receipt_lines = [
        "🛍️ *HELLOBEAUTY MARKETPLACE ORDER*",
        "==================================",
        f"*Order ID:* #HB-{order_id:05d}",
        f"*Date:* {datetime_str()}",
        "",
        "👤 *Customer Details:*",
        f"Name: {customer_name}",
        f"Phone: {phone}",
        f"Address: {address}",
        "==================================",
        "",
        "📦 *Items Ordered:*",
    ]
    
    for i, item in enumerate(items, 1):
        name = item.get("name")
        qty = item.get("quantity")
        price = item.get("price")
        chosen_var = item.get("chosen_variation") or {}
        
        # Build variation description string
        var_desc_list = []
        if chosen_var:
            for k, v in chosen_var.items():
                var_desc_list.append(f"{k}: {v}")
        var_desc = ", ".join(var_desc_list)
        
        item_total = price * qty
        receipt_lines.append(f"{i}. *{name}* (x{qty})")
        if var_desc:
            receipt_lines.append(f"   _Options:_ {var_desc}")
        receipt_lines.append(f"   _Price:_ ₹{price:,.2f} each | _Total:_ ₹{item_total:,.2f}")
        receipt_lines.append("")
        
    receipt_lines.extend([
        "==================================",
        f"💰 *TOTAL AMOUNT:* ₹{total_price:,.2f}",
        "==================================",
        "",
        "✨ Thank you for choosing hellobeauty! Please send this message to place your order, and our team will coordinate delivery with you.",
    ])
    
    receipt_text = "\n".join(receipt_lines)
    return receipt_text

def get_whatsapp_url(receipt_text: str, phone_number: str = WHATSAPP_PHONE) -> str:
    """
    Constructs the final wa.me routing URL with URL-encoded receipt parameter.
    """
    encoded_text = urllib.parse.quote(receipt_text)
    return f"https://wa.me/{phone_number}?text={encoded_text}"
