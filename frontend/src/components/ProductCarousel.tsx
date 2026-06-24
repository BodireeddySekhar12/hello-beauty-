import React, { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "./ProductCard";

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

interface ProductCarouselProps {
  title: string;
  products: Product[];
  favorites: number[];
  onToggleFavorite: (id: number) => void;
  onSelectProduct: (product: Product) => void;
  onAddToCart?: (product: Product, quantity: number, variations: Record<string, string>) => void;
}

export const ProductCarousel: React.FC<ProductCarouselProps> = ({
  title,
  products,
  favorites,
  onToggleFavorite,
  onSelectProduct,
  onAddToCart,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const clientWidth = scrollRef.current.clientWidth;
      const offset = direction === "left" ? -clientWidth * 0.8 : clientWidth * 0.8;
      scrollRef.current.scrollBy({
        left: offset,
        behavior: "smooth",
      });
    }
  };

  if (products.length === 0) return null;

  return (
    <div className="space-y-4 relative group/carousel">
      <div className="flex items-center justify-between border-b border-gray-150 pb-2">
        <h3 className="text-xl font-serif text-charcoal">{title}</h3>
      </div>

      <div className="relative px-1">
        {/* Left Floating Button */}
        <button
          type="button"
          onClick={() => scroll("left")}
          className="absolute -left-2 sm:-left-4 top-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white border border-[#E8E5DF] flex items-center justify-center text-charcoal shadow-md hover:bg-[#F3EBE0] hover:text-[#A8833E] hover:scale-105 active:scale-95 transition-all duration-300 opacity-0 group-hover/carousel:opacity-100 focus:opacity-100"
          aria-label="Scroll Left"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Scroller */}
        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto no-scrollbar scroll-smooth py-2 px-1 font-sans text-xs"
          style={{ flexWrap: "nowrap" }}
        >
          {products.map((product) => {
            const isFav = favorites.includes(product.id);
            return (
              <div key={product.id} className="w-48 flex-shrink-0">
                <ProductCard
                  product={product}
                  isFavorite={isFav}
                  onToggleFavorite={onToggleFavorite}
                  onSelectProduct={onSelectProduct}
                  onAddToCart={onAddToCart}
                />
              </div>
            );
          })}
        </div>

        {/* Right Floating Button */}
        <button
          type="button"
          onClick={() => scroll("right")}
          className="absolute -right-2 sm:-right-4 top-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white border border-[#E8E5DF] flex items-center justify-center text-charcoal shadow-md hover:bg-[#F3EBE0] hover:text-[#A8833E] hover:scale-105 active:scale-95 transition-all duration-300 opacity-0 group-hover/carousel:opacity-100 focus:opacity-100"
          aria-label="Scroll Right"
        >
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
    </div>
  );
};
export default ProductCarousel;
