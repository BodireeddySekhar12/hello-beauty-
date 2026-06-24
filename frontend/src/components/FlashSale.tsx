import React, { useState, useEffect, useRef } from "react";
import { Clock, Zap, ChevronLeft, ChevronRight } from "lucide-react";

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

interface FlashSaleProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
}

export const FlashSale: React.FC<FlashSaleProps> = ({ products, onSelectProduct }) => {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const clientWidth = scrollRef.current.clientWidth;
      const offset = direction === "left" ? -clientWidth * 0.8 : clientWidth * 0.8;
      scrollRef.current.scrollBy({
        left: offset,
        behavior: "smooth"
      });
    }
  };

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0); // Midnight tonight
      
      const diff = midnight.getTime() - now.getTime();
      
      if (diff > 0) {
        const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const m = Math.floor((diff / 1000 / 60) % 60);
        const s = Math.floor((diff / 1000) % 60);
        setTimeLeft({ hours: h, minutes: m, seconds: s });
      }
    };
    
    calculateTimeLeft();
    const timerInterval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timerInterval);
  }, []);

  // Use a subset of products (e.g., first 4) for flash sale
  const flashProducts = products.slice(0, 4);

  if (flashProducts.length === 0) return null;

  return (
    <div className="bg-white border border-[#E8E5DF] rounded-3xl p-6 shadow-subtle space-y-5 relative group/flash">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-[#5C1D24] text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
            <Zap className="w-3.5 h-3.5 fill-white" />
            <span>FLASH SALE</span>
          </div>
          
          {/* Countdown Clock */}
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold bg-[#F3EBE0] text-[#A8833E] border border-[#C5A059]/20 px-2.5 py-1 rounded-lg">
            <Clock className="w-3.5 h-3.5" />
            <span>{timeLeft.hours.toString().padStart(2, "0")}h</span>
            <span>:</span>
            <span>{timeLeft.minutes.toString().padStart(2, "0")}m</span>
            <span>:</span>
            <span>{timeLeft.seconds.toString().padStart(2, "0")}s</span>
          </div>
        </div>
        <span className="text-xs text-[#C5A059] font-bold">Resets at midnight tonight</span>
      </div>

      <div className="relative">
        {/* Left Floating Button */}
        <button
          type="button"
          onClick={() => scroll("left")}
          className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white border border-[#E8E5DF] flex items-center justify-center text-charcoal shadow-md hover:bg-[#F3EBE0] hover:text-[#A8833E] hover:scale-105 active:scale-95 transition-all duration-300 opacity-0 group-hover/flash:opacity-100 focus:opacity-100"
          aria-label="Scroll Left"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        <div 
          ref={scrollRef} 
          className="deals-scroller no-scrollbar scroll-smooth"
          style={{ flexWrap: "nowrap" }}
        >
          {flashProducts.map((prod) => (
            <div 
              key={prod.id} 
              onClick={() => onSelectProduct(prod)}
              className="deal-card cursor-pointer group"
            >
              <div className="aspect-square bg-gray-50 overflow-hidden relative">
                <img 
                  src={prod.image_url || "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=200"} 
                  alt={prod.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-2 left-2 bg-[#5C1D24] text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                  15% OFF
                </div>
              </div>
              <div className="p-3.5 space-y-2.5">
                <h4 className="font-bold text-xs truncate text-[#1C1A17]">{prod.name}</h4>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#5C1D24]">₹{(prod.price * 0.85).toLocaleString("en-IN")}</span>
                  <span className="text-[10px] line-through text-gray-400">₹{prod.price.toLocaleString("en-IN")}</span>
                </div>
                {/* Progress stock bar */}
                <div className="space-y-1">
                  <div className="w-full bg-gray-150 rounded-full h-1">
                    <div 
                      style={{ width: `${Math.min((prod.stock / 20) * 100, 100)}%` }}
                      className="bg-[#5C1D24] h-1 rounded-full animate-pulse"
                    />
                  </div>
                  <p className="text-[9px] text-gray-400 font-medium text-right">Only {prod.stock} left in stock</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right Floating Button */}
        <button
          type="button"
          onClick={() => scroll("right")}
          className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white border border-[#E8E5DF] flex items-center justify-center text-charcoal shadow-md hover:bg-[#F3EBE0] hover:text-[#A8833E] hover:scale-105 active:scale-95 transition-all duration-300 opacity-0 group-hover/flash:opacity-100 focus:opacity-100"
          aria-label="Scroll Right"
        >
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
    </div>
  );
};
export default FlashSale;
