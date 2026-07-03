import React, { useState, useRef } from "react";
import { 
  Heart, Search, Compass, User, ShoppingCart, MapPin, LogOut, ClipboardList, Store, Lock 
} from "lucide-react";
import logoMain from "../assets/logo_page_2.webp";
import logoCollections from "../assets/logo_page_3.webp";
import logoJewelry from "../assets/logo_page_4.webp";
import logoStudio from "../assets/logo_page_5.webp";

interface HeaderProps {
  currentView: "browse" | "admin";
  onSetCurrentView: (view: "browse" | "admin") => void;
  locationPincode: string;
  onOpenLocationModal: () => void;
  searchQuery: string;
  onSetSearchQuery: (query: string) => void;
  onOpenCart: () => void;
  cartItemsCount: number;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

const DEPARTMENTS = [
  { 
    name: "Makeup", 
    icon: "💄", 
    desc: "Lips, eyes & face beauty",
    subcategories: ["Lipsticks", "Eyeshadow", "Foundations", "Mascara", "Brushes", "Lip Gloss"],
    queries: { "Lipsticks": "Lipstick", "Eyeshadow": "Eye", "Foundations": "Foundation", "Mascara": "Mascara", "Brushes": "Brush", "Lip Gloss": "Gloss" }
  },
  { 
    name: "Jewelry", 
    icon: "💍", 
    desc: "Gold & silver designs",
    subcategories: ["Gold Chokers", "Silver Chains", "Diamond Rings", "Pearl Earrings", "Rings"],
    queries: { "Gold Chokers": "Choker", "Silver Chains": "Chain", "Diamond Rings": "Ring", "Pearl Earrings": "Pearl", "Rings": "Ring" }
  },
  { 
    name: "Skincare", 
    icon: "🌸", 
    desc: "Serums, creams & masks",
    subcategories: ["Vitamin C Serums", "Moisturizers", "Face Masks", "Toners", "Glow Creams"],
    queries: { "Vitamin C Serums": "Serum", "Moisturizers": "Moisturizer", "Face Masks": "Mask", "Toners": "Toner", "Glow Creams": "Cream" }
  },
  { 
    name: "Dresses", 
    icon: "👗", 
    desc: "Traditional & modern wear",
    subcategories: ["Velvet Kurtis", "Evening Gowns", "Summer Dresses", "Traditional Wear"],
    queries: { "Velvet Kurtis": "Kurti", "Evening Gowns": "Gown", "Summer Dresses": "Dress", "Traditional Wear": "Kurti" }
  },
  { 
    name: "Handbags", 
    icon: "👜", 
    desc: "Clutches, slings & totes",
    subcategories: ["Leather Totes", "Sling Bags", "Clutches", "Travel Bags"],
    queries: { "Leather Totes": "Tote", "Sling Bags": "Sling", "Clutches": "Clutch", "Travel Bags": "Bag" }
  },
  { 
    name: "Footwear", 
    icon: "👠", 
    desc: "Heels, flats & sneakers",
    subcategories: ["Stiletto Heels", "Comfort Flats", "Sneakers", "Boots"],
    queries: { "Stiletto Heels": "Heels", "Comfort Flats": "Flats", "Sneakers": "Sneaker", "Boots": "Boots" }
  }
];

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onSetCurrentView,
  locationPincode,
  onOpenLocationModal,
  searchQuery,
  onSetSearchQuery,
  customerPhone,
  onLogout,
  onOpenCart,
  cartItemsCount,
  selectedCategory,
  onSelectCategory,
  wishlistCount,
  onViewWishlist,
  onViewOrders,
  onViewProfile,
}) => {
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeDept, setActiveDept] = useState<string>("Makeup");

  const categoriesTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCategoriesMouseEnter = () => {
    if (categoriesTimeoutRef.current) {
      clearTimeout(categoriesTimeoutRef.current);
      categoriesTimeoutRef.current = null;
    }
    setIsCategoriesOpen(true);
  };

  const handleCategoriesMouseLeave = () => {
    if (categoriesTimeoutRef.current) {
      clearTimeout(categoriesTimeoutRef.current);
    }
    categoriesTimeoutRef.current = setTimeout(() => {
      setIsCategoriesOpen(false);
    }, 200);
  };
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("hb_recent_searches") || "[]");
    } catch {
      return [];
    }
  });

  const trendingSearches = ["Lipstick", "Velvet Kurti", "Gold Chain", "Face Cream"];

  const getSuggestions = (query: string) => {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    const allPossible = [
      "Lipstick", "Lip Gloss", "Lip Balm", "Gold Chain", "Gold Ring", "Gold Choker", 
      "Velvet Kurti", "Summer Dress", "Evening Gown", "Sling Bag", "Leather Tote", 
      "Stiletto Heels", "Vitamin C Serum", "Water Jelly Moisturizer"
    ];
    return allPossible.filter(item => item.toLowerCase().includes(q));
  };

  const handleSelectSearch = (term: string) => {
    onSetSearchQuery(term);
    onSetCurrentView("browse");
    
    const updated = [term, ...recentSearches.filter(t => t !== term)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("hb_recent_searches", JSON.stringify(updated));

    setTimeout(() => {
      const listEl = document.getElementById("shop-listings");
      if (listEl) {
        listEl.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

  const getDynamicLogo = () => {
    switch (selectedCategory) {
      case "Jewelry":
        return logoJewelry;
      case "Makeup":
      case "Skincare":
        return logoStudio;
      case "Dresses":
      case "Handbags":
      case "Footwear":
        return logoCollections;
      default:
        return logoMain;
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white text-gray-800 border-b border-gray-200 shadow-sm transition-all font-sans">
      <div className="container py-3 flex flex-col md:flex-row items-center justify-between gap-4">
        
        <div className="w-full md:w-auto flex items-center justify-between gap-6">
          {/* Logo Brand using official logo image */}
          <div 
            onClick={() => { onSetCurrentView("browse"); onSelectCategory(""); }}
            className="flex items-center cursor-pointer group"
          >
            <img 
              src={getDynamicLogo()} 
              alt="Hellobeauty Logo" 
              className="h-14 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
            />
          </div>

          {/* Location selector */}
          <div 
            onClick={onOpenLocationModal}
            className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-950 cursor-pointer bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5 transition-all"
          >
            <MapPin className="w-3.5 h-3.5 text-[#2874F0]" />
            <div className="text-[10px]">
              <p className="text-gray-400 font-medium leading-none">Deliver to</p>
              <p className="font-semibold text-gray-700 truncate max-w-[110px] leading-tight mt-0.5">{locationPincode}</p>
            </div>
          </div>
        </div>

        {/* Large Center Search Bar (Flipkart layout) */}
        <div className="w-full md:flex-1 max-w-xl relative">
          <div className="flex items-center bg-gray-100 border border-gray-200 rounded-lg px-4 py-2.5 shadow-sm text-charcoal focus-within:ring-2 focus-within:ring-[#2874F0] focus-within:bg-white focus-within:border-[#2874F0] transition-all">
            <Search className="w-4.5 h-4.5 text-[#2874F0] mr-2.5" />
            <input
              type="text"
              placeholder="Search chains, dress designs, cosmetics..."
              value={searchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}
              onChange={(e) => onSetSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchQuery.trim()) {
                  handleSelectSearch(searchQuery.trim());
                }
              }}
              className="bg-transparent border-0 outline-none text-xs text-gray-800 w-full placeholder-gray-400"
            />
          </div>

          {/* Autocomplete / Suggestions Overlay */}
          {isSearchFocused && (
            <div className="absolute left-0 right-0 mt-1 bg-white text-gray-800 border border-gray-200 rounded-xl shadow-focus z-50 overflow-hidden text-xs font-sans animate-fade-in">
              {searchQuery.trim() ? (
                // Suggestions List
                <div className="py-2">
                  <p className="px-4 py-1 text-[9px] uppercase tracking-wider text-gray-400 font-bold">Search Suggestions</p>
                  {getSuggestions(searchQuery).length > 0 ? (
                    getSuggestions(searchQuery).map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => handleSelectSearch(term)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 font-medium text-gray-700 transition-colors"
                      >
                        <Search className="w-3.5 h-3.5 text-gray-400" />
                        <span>{term}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-gray-400 italic">No direct suggestions found...</div>
                  )}
                </div>
              ) : (
                // Recent & Trending Searches
                <div className="divide-y divide-gray-100">
                  {recentSearches.length > 0 && (
                    <div className="py-2">
                      <p className="px-4 py-1 text-[9px] uppercase tracking-wider text-gray-400 font-bold">Recent Searches</p>
                      {recentSearches.map((term) => (
                        <button
                          key={term}
                          type="button"
                          onClick={() => handleSelectSearch(term)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 font-medium text-gray-700 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{term}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="py-2">
                    <p className="px-4 py-1 text-[9px] uppercase tracking-wider text-gray-400 font-bold">Trending Searches</p>
                    <div className="flex flex-wrap gap-2 px-4 py-2">
                      {trendingSearches.map((term) => (
                        <button
                          key={term}
                          type="button"
                          onClick={() => handleSelectSearch(term)}
                          className="px-3 py-1.5 bg-gray-50 hover:bg-[#E3EDFC] border border-gray-200 hover:border-[#2874F0]/40 rounded-full font-semibold text-gray-600 hover:text-[#2874F0] transition-all text-[10px]"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation Links & Action Badges */}
        <nav className="hidden md:flex items-center justify-end gap-3.5 text-xs font-semibold">
          {/* Categories Mega Dropdown */}
          <div 
            className="relative"
            onMouseEnter={handleCategoriesMouseEnter}
            onMouseLeave={handleCategoriesMouseLeave}
          >
            <button
              onClick={() => {
                onSelectCategory("All");
                onSetCurrentView("browse");
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all text-gray-600 hover:text-[#2874F0] ${
                currentView === "browse" ? "bg-gray-100 text-[#2874F0]" : ""
              }`}
            >
              <Compass className="w-4 h-4 text-[#2874F0]" />
              <span>Categories</span>
              <svg 
                className={`w-3 h-3 ml-0.5 transition-transform duration-300 ${isCategoriesOpen ? "rotate-180" : ""}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {isCategoriesOpen && (
              <div 
                className="absolute left-0 z-50 animate-fade-in font-sans select-none"
                style={{ top: "100%", width: "580px", paddingTop: "8px", backgroundColor: "transparent" }}
              >
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-0 flex overflow-hidden">
                  {/* Left Side: Categories list */}
                  <div className="bg-gray-50/80 border-r border-gray-100 p-3 space-y-1" style={{ width: "240px" }}>
                    <p className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-[#2874F0] font-bold border-b border-gray-100 mb-2">Shop by Departments</p>
                    
                    {/* Option for All Collections */}
                    <div
                      onMouseEnter={() => setActiveDept("All")}
                      onClick={() => {
                        onSelectCategory("All");
                        onSetCurrentView("browse");
                        setIsCategoriesOpen(false);
                      }}
                      className={`w-full text-left py-2 px-3 rounded-xl flex items-center gap-3 cursor-pointer transition-all duration-200 ${
                        activeDept === "All" 
                          ? "bg-blue-50 text-[#2874F0] translate-x-1 shadow-sm font-semibold" 
                          : "hover:bg-gray-100/60 text-gray-700 hover:text-gray-900"
                      }`}
                    >
                      <span className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-sm border border-gray-100">
                        🌟
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold leading-tight truncate">All Collections</p>
                        <p className={`text-[8px] leading-none mt-0.5 truncate ${activeDept === "All" ? "text-blue-400" : "text-gray-400"}`}>
                          View all beauty & fashion
                        </p>
                      </div>
                    </div>

                    {DEPARTMENTS.map((dept) => {
                      const isActive = activeDept === dept.name;
                      return (
                        <div
                          key={dept.name}
                          onMouseEnter={() => setActiveDept(dept.name)}
                          onClick={() => {
                            onSelectCategory(dept.name);
                            onSetCurrentView("browse");
                            setIsCategoriesOpen(false);
                          }}
                          className={`w-full text-left py-2 px-3 rounded-xl flex items-center gap-3 cursor-pointer transition-all duration-200 ${
                            isActive 
                              ? "bg-blue-50 text-[#2874F0] translate-x-1 shadow-sm font-semibold" 
                              : "hover:bg-gray-100/60 text-gray-700 hover:text-gray-900"
                          }`}
                        >
                          <span className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-sm border border-gray-100">
                            {dept.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold leading-tight truncate">{dept.name}</p>
                            <p className={`text-[8px] leading-none mt-0.5 truncate ${isActive ? "text-blue-400" : "text-gray-400"}`}>
                              {dept.desc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Right Side: Subcategories Details */}
                  <div className="flex-1 p-4 bg-white flex flex-col justify-between min-h-[350px]">
                    {activeDept === "All" ? (
                      <div>
                        <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-3">
                          <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                            <span className="text-sm">🌟</span>
                            <span>Full Marketplace</span>
                          </h4>
                          <button 
                            onClick={() => {
                              onSelectCategory("All");
                              onSetCurrentView("browse");
                              setIsCategoriesOpen(false);
                            }}
                            className="text-[9px] text-[#2874F0] hover:underline font-bold"
                          >
                            View All
                          </button>
                        </div>
                        <p className="text-[10px] text-gray-500 leading-relaxed mb-4">
                          Discover India’s trusted beauty & fashion marketplace offering premium cosmetics, skincare, jewelry, and lifestyle products.
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {DEPARTMENTS.map((dept) => (
                            <button
                              key={dept.name}
                              onClick={() => {
                                onSelectCategory(dept.name);
                                onSetCurrentView("browse");
                                setIsCategoriesOpen(false);
                              }}
                              className="text-left px-3 py-2 text-[10px] font-medium text-gray-600 hover:text-[#2874F0] hover:bg-blue-50/50 rounded-lg transition-all duration-150 flex items-center gap-2 border border-transparent hover:border-blue-100/50"
                            >
                              <span className="text-xs">{dept.icon}</span>
                              <span>{dept.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (() => {
                      const currentDept = DEPARTMENTS.find(d => d.name === activeDept) || DEPARTMENTS[0];
                      return (
                        <div>
                          <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-3">
                            <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                              <span className="text-sm">{currentDept.icon}</span>
                              <span>{currentDept.name} Subcategories</span>
                            </h4>
                            <button 
                              onClick={() => {
                                onSelectCategory(currentDept.name);
                                onSetCurrentView("browse");
                                setIsCategoriesOpen(false);
                              }}
                              className="text-[9px] text-[#2874F0] hover:underline font-bold"
                            >
                              View All
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {currentDept.subcategories.map((sub) => (
                              <button
                                key={sub}
                                onClick={() => {
                                  const query = (currentDept.queries as any)[sub] || sub;
                                  onSetSearchQuery(query);
                                  onSelectCategory(currentDept.name);
                                  onSetCurrentView("browse");
                                  setIsCategoriesOpen(false);
                                  setTimeout(() => {
                                    const listEl = document.getElementById("shop-listings");
                                    if (listEl) listEl.scrollIntoView({ behavior: "smooth" });
                                  }, 100);
                                }}
                                className="text-left px-3 py-2 text-[10px] font-medium text-gray-600 hover:text-[#2874F0] hover:bg-blue-50/50 rounded-lg transition-all duration-150 flex items-center gap-2 border border-transparent hover:border-blue-100/50"
                              >
                                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#F59E0B' }} />
                                <span>{sub}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Featured Banner Promo at bottom of subcategories */}
                    <div 
                      className="mt-4 p-3 rounded-xl border flex items-center justify-between"
                      style={{ 
                        background: "linear-gradient(to right, #EFF6FF, #EEF2F6)", 
                        borderColor: "rgba(37, 99, 235, 0.15)"
                      }}
                    >
                      <div className="min-w-0 flex-1 mr-2">
                        <p className="text-[10px] font-bold text-blue-900 leading-tight">
                          Authentic {activeDept === "All" ? "Hellobeauty" : activeDept} Collection
                        </p>
                        <p className="text-[8px] text-blue-600 font-medium leading-none mt-1">
                          Top-tier brands. Secure checkout. Fast Delivery.
                        </p>
                      </div>
                      <button 
                        onClick={() => {
                          onSelectCategory(activeDept === "All" ? "All" : activeDept);
                          onSetCurrentView("browse");
                          setIsCategoriesOpen(false);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-[#2874F0] hover:bg-[#1a62d6] text-white text-[8px] font-bold transition-all flex-shrink-0"
                      >
                        Shop Now
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Staff Portal Link */}
          <button
            onClick={() => onSetCurrentView("admin")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all ${
              currentView === "admin" 
                ? "text-[#2874F0] bg-gray-100" 
                : "text-gray-600 hover:text-[#2874F0]"
            }`}
          >
            <Lock className="w-4 h-4 text-gray-400" />
            <span>Staff Portal</span>
          </button>

          {/* Cart Button with Count Badge */}
          <button
            onClick={onOpenCart}
            className="relative p-2.5 rounded-full bg-[#2874F0] hover:bg-[#1259C9] text-white transition-all shadow-md active:scale-95 duration-200"
            aria-label="View Cart"
          >
            <ShoppingCart className="w-4.5 h-4.5" />
            {cartItemsCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#FF9F00] text-white text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-bounce">
                {cartItemsCount}
              </span>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
};
