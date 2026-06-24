import React, { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Eye, MousePointerClick, Heart, ShieldCheck, ShoppingCart, Star, MessageSquare } from "lucide-react";
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

interface ProductDetailsProps {
  product: Product;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: (id: number) => void;
  onAddToCart: (product: Product, quantity: number, variations: Record<string, string>) => void;
  onBuyNow: (product: Product, quantity: number, variations: Record<string, string>) => void;
}

export const ProductDetails: React.FC<ProductDetailsProps> = ({
  product,
  onClose,
  isFavorite,
  onToggleFavorite,
  onAddToCart,
  onBuyNow,
}) => {
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({});
  const [imageIndex, setImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const hasDiscount = product.discount > 0;
  const discountedPrice = hasDiscount 
    ? product.price * (1 - product.discount / 100) 
    : product.price;

  useEffect(() => {
    // Register product click metric
    api.registerClick(product.id).catch((err) => console.error("Error registering click:", err));
    
    // Auto-select first variation option
    if (product.variations) {
      const initial: Record<string, string> = {};
      Object.entries(product.variations).forEach(([key, values]) => {
        if (values && values.length > 0) {
          initial[key] = values[0];
        }
      });
      setSelectedVariations(initial);
    }
  }, [product.id]);

  const images = [
    product.image_url || "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600",
    product.category === "Chains" 
      ? "https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=600"
      : product.category === "Makeup"
      ? "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600"
      : "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600",
    product.category === "Chains"
      ? "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600"
      : product.category === "Makeup"
      ? "https://images.unsplash.com/photo-1617220828711-b31c0e30c63e?w=600"
      : "https://images.unsplash.com/photo-1618244972963-dbee1a7edc95?w=600"
  ];

  const nextImage = () => {
    setImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleAddToCartClick = () => {
    setErrorMsg("");
    
    // Verify all variations are chosen
    if (product.variations) {
      const missing = Object.keys(product.variations).filter(key => !selectedVariations[key]);
      if (missing.length > 0) {
        setErrorMsg(`Please select options for ${missing.join(", ")}.`);
        return;
      }
    }

    if (quantity > product.stock) {
      setErrorMsg("Quantity exceeds available stock.");
      return;
    }

    // Pass product with correct discounted price to shopping cart if needed
    const cartProduct = { ...product, price: discountedPrice };
    onAddToCart(cartProduct, quantity, selectedVariations);
    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
      onClose();
    }, 1200);
  };

  const handleBuyNowClick = () => {
    setErrorMsg("");
    
    // Verify all variations are chosen
    if (product.variations) {
      const missing = Object.keys(product.variations).filter(key => !selectedVariations[key]);
      if (missing.length > 0) {
        setErrorMsg(`Please select options for ${missing.join(", ")}.`);
        return;
      }
    }

    if (quantity > product.stock) {
      setErrorMsg("Quantity exceeds available stock.");
      return;
    }

    const buyProduct = { ...product, price: discountedPrice };
    onBuyNow(buyProduct, quantity, selectedVariations);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-lg h-full bg-[#FAF9F6] shadow-focus flex flex-col relative animate-fade-in-up"
        style={{ animationDuration: "0.4s" }}
      >
        {/* Header */}
        <div className="hidden md:flex p-4 border-b border-gray-200 items-center justify-between bg-white">
          <span className="text-xs uppercase tracking-widest text-[#6B655B] font-semibold font-sans">
            {product.category}
          </span>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
            aria-label="Close details"
          >
            <X className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pb-32">
          {/* Image Carousel */}
          <div className="relative aspect-square w-full bg-gray-100 overflow-hidden group">
            {/* Mobile Floating Back Button */}
            <button
              onClick={onClose}
              className="md:hidden absolute top-4 left-4 z-20 p-2.5 rounded-full bg-white/80 backdrop-blur text-gray-800 shadow-md active:scale-90 transition-all duration-200"
              aria-label="Go Back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <img 
              src={images[imageIndex]} 
              alt={product.name} 
              className="w-full h-full object-cover transition-all duration-500 ease-out" 
            />
            {hasDiscount && (
              <span className="absolute top-4 left-14 md:left-4 z-10 bg-[#5C1D24] text-white text-[10px] font-bold px-3 py-1 rounded-full font-sans shadow-md">
                {product.discount}% OFF
              </span>
            )}
            {images.length > 1 && (
              <>
                <button 
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white text-gray-800 shadow-md transition-all opacity-0 group-hover:opacity-100 duration-200"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button 
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white text-gray-800 shadow-md transition-all opacity-0 group-hover:opacity-100 duration-200"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                
                {/* Dots indicator */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {images.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setImageIndex(idx)}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        idx === imageIndex ? "bg-[#C5A059] w-4" : "bg-white/50"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
            
            {/* Favorite button overlay */}
            <button 
              onClick={() => onToggleFavorite(product.id)}
              className="absolute top-4 right-4 p-2.5 rounded-full bg-white/90 hover:bg-white text-[#5C1D24] shadow-md transition-all active:scale-95 duration-200"
            >
              <Heart className={`w-5 h-5 ${isFavorite ? "fill-[#5C1D24]" : ""}`} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Title & Price */}
            <div className="space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-serif text-[#1C1A17]">{product.name}</h2>
                  {product.brand && (
                    <p className="text-xs text-gray-400 font-medium font-sans uppercase tracking-wider mt-0.5">
                      Brand: {product.brand}
                    </p>
                  )}
                </div>
                {product.rating > 0 && (
                  <div className="flex items-center gap-1 bg-[#F3EBE0] px-2.5 py-1 rounded-full text-xs text-[#A8833E] font-bold border border-[#C5A059]/20 font-sans">
                    <Star className="w-3.5 h-3.5 fill-[#C5A059] text-[#C5A059]" />
                    <span>{product.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-between border-t border-gray-105 pt-3">
                <div className="flex items-baseline gap-2 font-sans">
                  <span className="text-2xl font-bold text-[#C5A059]">
                    ₹{discountedPrice.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </span>
                  {hasDiscount && (
                    <span className="text-sm text-gray-400 line-through">
                      ₹{product.price.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </span>
                  )}
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  product.stock > 0 ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
                }`}>
                  {product.stock > 0 ? `${product.stock} items left` : "Out of Stock"}
                </span>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3.5 bg-red-50 text-red-600 rounded-xl text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <h4 className="text-xs uppercase tracking-widest text-[#6B655B] font-semibold">The Story</h4>
              <p className="text-sm text-[#6B655B] leading-relaxed font-sans">{product.description}</p>
            </div>

            {/* Variations Picker */}
            {product.variations && Object.entries(product.variations).length > 0 && (
              <div className="space-y-4 border-t border-gray-100 pt-4">
                {Object.entries(product.variations).map(([varType, options]) => (
                  <div key={varType} className="space-y-2">
                    <h4 className="text-xs uppercase tracking-widest text-[#6B655B] font-semibold">
                      Select {varType}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {options.map((option) => {
                        const isSelected = selectedVariations[varType] === option;
                        return (
                          <button
                            key={option}
                            onClick={() => setSelectedVariations(prev => ({ ...prev, [varType]: option }))}
                            className={`px-4 py-2 text-xs border rounded-full font-medium transition-all duration-200 ${
                              isSelected 
                                ? "bg-[#C5A059] text-white border-[#C5A059]" 
                                : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                            }`}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Real-time counters */}
            <div className="flex items-center gap-6 border-t border-b border-gray-100 py-4 text-xs text-gray-500 font-sans font-medium">
              <span className="flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-gray-400" />
                {product.views} active views
              </span>
              <span className="flex items-center gap-1.5">
                <MousePointerClick className="w-4 h-4 text-gray-400" />
                {product.clicks} clicks recorded
              </span>
            </div>

            {/* Purchase quantity */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Quantity</span>
              <div className="flex items-center border border-gray-200 rounded-full bg-white p-1">
                <button 
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-50 text-gray-600 font-bold"
                >
                  -
                </button>
                <span className="w-12 text-center text-sm font-semibold">{quantity}</span>
                <button 
                  onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-50 text-gray-600 font-bold"
                  disabled={quantity >= product.stock}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Actions Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur border-t border-gray-100 z-20 flex flex-col gap-3">
          {product.stock > 0 ? (
            <div className="flex gap-3">
              <button
                onClick={handleAddToCartClick}
                disabled={isAdded}
                className={`flex-1 py-4 text-white font-semibold rounded-full flex items-center justify-center gap-2 shadow-lg transition-all duration-300 ${
                  isAdded 
                    ? "bg-green-600 shadow-green-200 scale-[0.98]" 
                    : "bg-[#1C1A17] hover:bg-[#2D2D2D] hover:shadow-xl"
                }`}
              >
                <ShoppingCart className="w-5 h-5" />
                <span>{isAdded ? "ADDED!" : "ADD TO CART"}</span>
              </button>
              <button
                onClick={handleBuyNowClick}
                className="flex-1 py-4 bg-[#0F8A5F] hover:bg-[#09724C] text-white font-semibold rounded-full flex items-center justify-center gap-2 shadow-lg transition-all duration-300"
              >
                <MessageSquare className="w-5 h-5 fill-white text-white" />
                <span>BUY NOW</span>
              </button>
            </div>
          ) : (
            <button
              disabled
              className="w-full py-4 bg-gray-300 text-gray-500 font-semibold rounded-full cursor-not-allowed flex items-center justify-center gap-2"
            >
              OUT OF STOCK
            </button>
          )}
          <span className="text-[10px] text-center text-gray-400 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#C5A059]" />
            Secured checkout routing to verified WhatsApp channel
          </span>
        </div>
      </div>
    </div>
  );
};
