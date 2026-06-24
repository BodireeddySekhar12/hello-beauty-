import React, { useState, useEffect } from "react";
import summerBeautyBanner from "../assets/summer_beauty_banner.webp";
import premiumJewelryBanner from "../assets/premium_jewelry_banner.webp";
import newFashionBanner from "../assets/new_fashion_banner.webp";

interface Banner {
  id: number;
  title: string;
  subtitle: string;
  imageUrl: string;
  ctaText: string;
  objectPosition: string;
}

export const HeroBanner: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const banners: Banner[] = [
    {
      id: 1,
      title: "Summer Beauty Collection",
      subtitle: "Luxury organic skincare & high-pigment cosmetics for a radiant glow",
      imageUrl: summerBeautyBanner,
      ctaText: "Shop Now",
      objectPosition: "center"
    },
    {
      id: 2,
      title: "Premium Jewelry Collection",
      subtitle: "Luxury handcrafted pieces for modern elegance",
      imageUrl: premiumJewelryBanner,
      ctaText: "Explore Collection",
      objectPosition: "center"
    },
    {
      id: 3,
      title: "New Fashion Arrivals",
      subtitle: "Ethereal velvet kurtis, linen dresses, and the latest trends of 2026",
      imageUrl: newFashionBanner,
      ctaText: "Shop Now",
      objectPosition: "center"
    }
  ];

  useEffect(() => {
    const bannerInterval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(bannerInterval);
  }, [banners.length]);

  return (
    <div className="relative w-full overflow-hidden rounded-3xl h-[250px] sm:h-[320px] md:h-[420px] bg-[#1C1A17] border border-[#E8E5DF] shadow-md group">
      
      {/* Slide Images */}
      {banners.map((banner, idx) => (
        <div
          key={banner.id}
          className={`banner-slide ${idx === currentSlide ? "active" : ""}`}
        >
          {/* Background Image with Object fit and custom crop positioning */}
          <img 
            src={banner.imageUrl} 
            alt={banner.title} 
            className="absolute inset-0 w-full h-full object-cover object-center scale-100"
            style={{ objectPosition: banner.objectPosition }}
          />
          
          {/* Soft Premium Gradient Overlay: bg-gradient-to-r from-black/40 to-transparent */}
          <div 
            className="absolute inset-0 z-10"
            style={{ background: "linear-gradient(to right, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0) 100%)" }}
          />

          {/* Banner Text Content */}
          <div className="absolute left-10 md:left-16 top-1/2 -translate-y-1/2 z-20 max-w-[85%] sm:max-w-[55%] text-white space-y-4 md:space-y-5">
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold font-serif leading-tight text-white drop-shadow-md">
              {banner.title}
            </h2>
            <p className="text-xs sm:text-sm md:text-lg text-gray-200 leading-relaxed drop-shadow-sm line-clamp-2">
              {banner.subtitle}
            </p>
            <div className="pt-2">
              <button 
                onClick={() => {
                  const browseEl = document.getElementById("shop-listings");
                  if (browseEl) {
                    browseEl.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] sm:text-xs md:text-sm font-bold uppercase tracking-wider px-6 py-3 rounded-xl transition-all duration-300 transform active:scale-95 shadow-lg"
              >
                {banner.ctaText}
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Carousel Indicators */}
      <div className="absolute bottom-4 left-10 md:left-16 flex gap-2 z-20">
        {banners.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentSlide(idx)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              idx === currentSlide ? "bg-blue-600 w-6" : "bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroBanner;


