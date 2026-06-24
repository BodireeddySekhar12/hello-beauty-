import React from "react";
import { Heart, ChevronRight, Star } from "lucide-react";

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

interface ProductCardProps {
  product: Product;
  isFavorite: boolean;
  onToggleFavorite: (id: number) => void;
  onSelectProduct: (product: Product) => void;
  onAddToCart?: (product: Product, quantity: number, variations: Record<string, string>) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isFavorite,
  onToggleFavorite,
  onSelectProduct,
  onAddToCart,
}) => {
  const hasDiscount = product.discount > 0;
  const discountedPrice = hasDiscount 
    ? product.price * (1 - product.discount / 100) 
    : product.price;

  return (
    <div 
      className="group bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-subtle hover:shadow-premium hover:border-[#2874F0]/40 transition-all duration-300 flex flex-col relative h-full"
    >
      {/* Discount Overlay Tag */}
      {hasDiscount && (
        <span className="absolute top-3 left-3 z-10 bg-[#FF9F00] text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full font-sans shadow-sm">
          {product.discount}% OFF
        </span>
      )}

      {/* Favorite Overlay */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(product.id);
        }}
        className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/95 hover:bg-white text-[#FF9F00] shadow-sm active:scale-90 transition-all duration-300"
      >
        <Heart className={`w-4 h-4 ${isFavorite ? "fill-[#FF9F00] text-[#FF9F00]" : ""}`} />
      </button>

      {/* Image box */}
      <div 
        onClick={() => onSelectProduct(product)}
        className="aspect-square w-full overflow-hidden bg-gray-50 border-b border-gray-100 cursor-pointer relative"
      >
        <img
          src={product.image_url || "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400"}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
            <span className="px-3 py-1 bg-white text-gray-800 text-[10px] font-bold rounded-full">
              SOLD OUT
            </span>
          </div>
        )}
      </div>

      {/* Details Box */}
      <div className="p-4 flex-grow flex flex-col justify-between space-y-3 font-sans">
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[9px] uppercase tracking-widest text-[#2874F0] font-bold">
            <span>{product.category}</span>
            {product.brand && <span className="text-gray-400 font-medium normal-case tracking-normal">{product.brand}</span>}
          </div>
          <h3 
            onClick={() => onSelectProduct(product)}
            className="text-xs font-semibold text-gray-800 leading-snug cursor-pointer hover:text-[#2874F0] transition-colors line-clamp-2 h-8"
          >
            {product.name}
          </h3>
          
          {/* Rating - Stars Row */}
          {product.rating > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <div className="flex items-center gap-0.5 text-[#FF9F00]">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${
                      i < Math.floor(product.rating)
                        ? "fill-[#FF9F00] text-[#FF9F00]"
                        : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
              <span className="text-[10px] text-gray-500 font-bold ml-1">{product.rating.toFixed(1)}</span>
            </div>
          )}

          {/* Free Delivery Tag */}
          <div className="pt-0.5">
            <span className="bg-green-50 text-green-700 border border-green-200 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
              Free Delivery
            </span>
          </div>
        </div>
        
        <div className="space-y-2.5 pt-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-bold text-gray-900">
                ₹{discountedPrice.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </span>
              {hasDiscount && (
                <span className="text-[10px] text-gray-400 line-through">
                  ₹{product.price.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </span>
              )}
            </div>
            <button
              onClick={() => onSelectProduct(product)}
              className="p-1.5 rounded-full bg-[#E3EDFC] text-[#2874F0] hover:bg-[#2874F0] hover:text-white transition-all duration-300 flex-shrink-0"
              title="Open Details"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Add to Cart Button directly on Card */}
          {onAddToCart && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (product.stock === 0) return;
                const defaultOptions: Record<string, string> = {};
                if (product.variations) {
                  Object.entries(product.variations).forEach(([k, vals]) => {
                    if (vals && vals.length > 0) defaultOptions[k] = vals[0];
                  });
                }
                onAddToCart(product, 1, defaultOptions);
                alert(`${product.name} added to cart!`);
              }}
              disabled={product.stock === 0}
              className={`w-full py-2 text-[10px] font-bold rounded-full transition-all duration-300 uppercase tracking-wider ${
                product.stock === 0
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-[#2874F0] hover:bg-[#1259C9] text-white hover:shadow active:scale-95"
              }`}
            >
              {product.stock === 0 ? "Out of Stock" : "Add to Cart"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
