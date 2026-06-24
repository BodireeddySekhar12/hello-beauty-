import React, { useState, useEffect } from "react";
import { ShoppingCart, X, Plus, Minus, Trash2, MessageSquare } from "lucide-react";
import { api } from "../services/api";

interface Product {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  image_url: string | null;
  brand: string | null;
  discount: number;
  rating: number;
  variations: Record<string, string[]> | null;
  views: number;
  clicks: number;
}

interface CartItem {
  product: Product;
  quantity: number;
  variations: Record<string, string>;
}

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateCartQuantity: (index: number, newQty: number) => void;
  onRemoveFromCart: (index: number) => void;
  onCheckoutSubmit: (custName: string, custPhone: string, custAddress: string, couponCode: string) => Promise<void>;
  customerToken?: string | null;
  customerData?: any;
}

export const CartSidebar: React.FC<CartSidebarProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateCartQuantity,
  onRemoveFromCart,
  onCheckoutSubmit,
  customerToken,
  customerData,
}) => {
  const [custName, setCustName] = useState(localStorage.getItem("hb_customer_name") || "");
  const [custPhone, setCustPhone] = useState(localStorage.getItem("hb_customer_phone") || "");
  const [custAddress, setCustAddress] = useState(localStorage.getItem("hb_customer_address") || "");

  useEffect(() => {
    if (isOpen) {
      if (customerData) {
        setCustName(customerData.name || "");
        setCustPhone(customerData.phone || "");
        
        // Fetch addresses to get the default shipping address if logged in
        if (customerToken && customerData.id) {
          api.getAddresses(customerToken, customerData.id)
            .then((addresses) => {
              const defaultAddr = addresses.find((a: any) => a.is_default) || addresses[0];
              if (defaultAddr) {
                const addrStr = `${defaultAddr.address_line}, ${defaultAddr.city}, ${defaultAddr.state} - ${defaultAddr.pincode}`;
                setCustAddress(addrStr);
              } else {
                setCustAddress(localStorage.getItem("hb_customer_address") || "");
              }
            })
            .catch((err) => {
              console.error("Failed to load customer default address:", err);
              setCustAddress(localStorage.getItem("hb_customer_address") || "");
            });
        } else {
          setCustAddress(localStorage.getItem("hb_customer_address") || "");
        }
      } else {
        // Fallback to local storage if no user logged in
        setCustName(localStorage.getItem("hb_customer_name") || "");
        setCustPhone(localStorage.getItem("hb_customer_phone") || "");
        setCustAddress(localStorage.getItem("hb_customer_address") || "");
      }
    }
  }, [isOpen, customerData, customerToken]);
  const [isCheckoutSubmitting, setIsCheckoutSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [couponMsg, setCouponMsg] = useState("");

  const handleApplyCoupon = () => {
    setCouponMsg("");
    const code = couponInput.trim().toUpperCase();
    if (code === "WELCOME10") {
      setAppliedCoupon(code);
      setDiscountPercent(10);
      setCouponMsg("Coupon 'WELCOME10' applied! 10% discount.");
    } else if (code === "BEAUTY15") {
      setAppliedCoupon(code);
      setDiscountPercent(15);
      setCouponMsg("Coupon 'BEAUTY15' applied! 15% discount.");
    } else if (code === "FIRST20") {
      setAppliedCoupon(code);
      setDiscountPercent(20);
      setCouponMsg("Coupon 'FIRST20' applied! 20% discount.");
    } else {
      setAppliedCoupon("");
      setDiscountPercent(0);
      setCouponMsg("Invalid coupon code.");
    }
  };

  const cartTotalVal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError("");
    
    if (cart.length === 0) {
      setCheckoutError("Your cart is empty.");
      return;
    }

    if (!custName.trim() || !custPhone.trim() || !custAddress.trim()) {
      setCheckoutError("Please specify customer checkout details.");
      return;
    }

    if (custPhone.trim().length < 10) {
      setCheckoutError("Please enter a valid 10-digit phone number.");
      return;
    }

    setIsCheckoutSubmitting(true);
    try {
      await onCheckoutSubmit(custName.trim(), custPhone.trim(), custAddress.trim(), appliedCoupon);
    } catch (err: any) {
      setCheckoutError(err.message || "Checkout failed. Verify stock levels.");
    } finally {
      setIsCheckoutSubmitting(false);
    }
  };

  return (
    <>
      <div className={`cart-backdrop ${isOpen ? "open" : ""}`} onClick={onClose} />
      <div className={`cart-sidebar ${isOpen ? "open" : ""} flex flex-col`}>
        
        {/* Cart Header */}
        <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-[#C5A059]" />
            <h3 className="font-serif text-lg text-charcoal">My Shopping Cart</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-150 rounded-full" aria-label="Close Cart">
            <X className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        {/* Cart items list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cart.map((item, idx) => (
            <div key={idx} className="bg-white border border-gray-200 rounded-xl p-3 flex gap-3 relative">
              <img 
                src={item.product.image_url || "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=60"}
                alt={item.product.name}
                className="w-12 h-12 object-cover rounded-lg border border-gray-100 flex-shrink-0"
              />
              <div className="flex-grow space-y-1.5 text-xs">
                <h4 className="font-bold text-gray-800 line-clamp-1">{item.product.name}</h4>
                <p className="text-gray-900 font-semibold">₹{(item.product.price * item.quantity).toLocaleString("en-IN")}</p>
                
                {/* Variations */}
                {Object.keys(item.variations).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(item.variations).map(([k, v]) => (
                      <span key={k} className="text-[9px] bg-[#F3EBE0] text-[#A8833E] px-1.5 py-0.5 rounded">
                        {k}: {v}
                      </span>
                    ))}
                  </div>
                )}
                
                {/* Quantity triggers */}
                <div className="flex items-center gap-2.5 pt-1">
                  <button 
                    onClick={() => onUpdateCartQuantity(idx, item.quantity - 1)}
                    className="p-1 border border-gray-200 rounded-full hover:bg-gray-50"
                    aria-label="Decrease Quantity"
                  >
                    <Minus className="w-3 h-3 text-gray-600" />
                  </button>
                  <span className="font-bold text-gray-800">{item.quantity}</span>
                  <button 
                    onClick={() => onUpdateCartQuantity(idx, item.quantity + 1)}
                    className="p-1 border border-gray-200 rounded-full hover:bg-gray-50"
                    disabled={item.quantity >= item.product.stock}
                    aria-label="Increase Quantity"
                  >
                    <Plus className="w-3 h-3 text-gray-600" />
                  </button>
                </div>
              </div>
              <button 
                onClick={() => onRemoveFromCart(idx)}
                className="absolute top-2 right-2 p-1.5 text-gray-300 hover:text-red-500 rounded-full"
                aria-label="Remove Item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {cart.length === 0 && (
            <div className="text-center py-16 text-gray-400 space-y-2">
              <ShoppingCart className="w-8 h-8 mx-auto text-gray-300" />
              <p className="font-medium text-sm">Your cart is currently empty</p>
              <p className="text-xs">Browse the categories to find premium ladies' products!</p>
            </div>
          )}
        </div>

        {/* Sticky checkout order invoice panel */}
        {cart.length > 0 && (
          <div className="p-4 bg-white border-t border-gray-200 space-y-4">
            
            {/* Invoice Summary */}
            <div className="space-y-1.5 text-xs border-b border-gray-100 pb-3 font-sans">
              <div className="flex justify-between text-gray-500">
                <span>Items Count:</span>
                <span>{cart.reduce((sum, item) => sum + item.quantity, 0)} items</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Cart Total:</span>
                <span>₹{cartTotalVal.toLocaleString("en-IN")}</span>
              </div>
              {discountPercent > 0 && (
                <div className="flex justify-between text-[#0F8A5F] font-semibold">
                  <span>Discount ({discountPercent}%):</span>
                  <span>-₹{((cartTotalVal * discountPercent) / 100).toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-charcoal text-sm pt-1 border-t border-dashed border-gray-100">
                <span>Total Invoice:</span>
                <span className="text-[#C5A059] text-base">₹{(cartTotalVal * (1 - discountPercent / 100)).toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Coupons Section */}
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-150 space-y-2 text-[10px] font-sans">
              <label className="uppercase tracking-wider text-gray-400 font-bold block">Apply Promo Coupon</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. WELCOME10, BEAUTY15"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  className="flex-grow p-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#C5A059]"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  className="px-4 py-2 bg-[#1C1A17] text-white hover:bg-black font-semibold rounded-lg text-xs transition-all"
                >
                  Apply
                </button>
              </div>
              {couponMsg && (
                <p className={`text-[9px] font-bold ${discountPercent > 0 ? "text-[#0F8A5F]" : "text-red-500"}`}>
                  {couponMsg}
                </p>
              )}
              <p className="text-[8px] text-gray-400 font-medium">Codes: WELCOME10 (10%), BEAUTY15 (15%), FIRST20 (20%)</p>
            </div>

            {/* Error notifications */}
            {checkoutError && (
              <div className="p-2.5 bg-red-50 text-red-600 border border-red-100 rounded-xl text-[10px] font-semibold">
                {checkoutError}
              </div>
            )}

            {/* Customer Details Form */}
            <form onSubmit={handleSubmit} className="space-y-3 text-[10px] font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="uppercase tracking-wider text-gray-400 font-bold">Name</label>
                  <input
                    type="text"
                    required
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    className="w-full p-2.5 border border-gray-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#C5A059]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="uppercase tracking-wider text-gray-400 font-bold">WhatsApp Number</label>
                  <input
                    type="tel"
                    required
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="10 digit number"
                    className="w-full p-2.5 border border-gray-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#C5A059]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="uppercase tracking-wider text-gray-400 font-bold">Shipping Address</label>
                <textarea
                  required
                  rows={2}
                  value={custAddress}
                  onChange={(e) => setCustAddress(e.target.value)}
                  placeholder="House details, street address, city, pin code"
                  className="w-full p-2.5 border border-gray-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#C5A059] resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isCheckoutSubmitting}
                className="w-full py-3.5 bg-[#0F8A5F] hover:bg-[#09724C] text-white font-semibold rounded-full flex items-center justify-center gap-1.5 shadow-lg transition-all animate-pulse-green text-xs"
                style={{
                  boxShadow: "0 4px 14px rgba(15, 138, 95, 0.3)"
                }}
              >
                {isCheckoutSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4 fill-white" />
                    <span>CHECKOUT VIA WHATSAPP</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  );
};
