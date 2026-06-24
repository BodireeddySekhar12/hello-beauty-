import React from "react";

interface CategoryGridProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export const CategoryGrid: React.FC<CategoryGridProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  const categories = [
    { name: "All", label: "For You", emoji: "🌟", bg: "bg-[#E3EDFC]" },
    { name: "Makeup", label: "Makeup", emoji: "💄", bg: "bg-[#FFEAEF]" },
    { name: "Dresses", label: "Dresses", emoji: "👗", bg: "bg-[#EFEAFF]" },
    { name: "Jewelry", label: "Jewelry", emoji: "💍", bg: "bg-[#FFF9E6]" },
    { name: "Handbags", label: "Handbags", emoji: "👜", bg: "bg-[#E6FDF4]" },
    { name: "Footwear", label: "Footwear", emoji: "👠", bg: "bg-[#FFF0E6]" },
    { name: "Skincare", label: "Skincare", emoji: "🌸", bg: "bg-[#E6FAFD]" }
  ];

  return (
    <div className="py-4 bg-white border border-gray-200 rounded-3xl px-6 shadow-sm">
      <div className="flex items-center gap-6 md:gap-8 overflow-x-auto no-scrollbar scroll-smooth py-1.5 justify-start md:justify-center">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.name;
          return (
            <button
              key={cat.name}
              onClick={() => onSelectCategory(cat.name)}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 group focus:outline-none"
            >
              <div 
                className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all duration-300 shadow-sm border-2 ${
                  isActive 
                    ? "bg-[#2874F0] border-white ring-2 ring-[#2874F0] scale-105 shadow-md transform -translate-y-0.5" 
                    : `${cat.bg} border-transparent hover:border-[#2874F0]/30 hover:scale-105 hover:shadow-md`
                }`}
              >
                <span className={`transition-transform duration-300 group-hover:scale-110 ${isActive ? "brightness-110" : ""}`}>
                  {cat.emoji}
                </span>
              </div>
              <span 
                className={`text-[10px] font-sans font-bold tracking-wide uppercase transition-colors duration-300 ${
                  isActive ? "text-[#2874F0] scale-105" : "text-gray-500 group-hover:text-[#2874F0]"
                }`}
              >
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryGrid;
