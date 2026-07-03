import React from "react";
import { Home, Grid, Heart, User, ShoppingCart } from "lucide-react";

interface BottomNavigationProps {
  currentView: "browse" | "dashboard" | "admin";
  selectedCategory: string;
  onSetCurrentView: (view: "browse" | "dashboard" | "admin") => void;
  onSelectCategory: (category: string) => void;
  onOpenCart: () => void;
  cartItemsCount: number;
  wishlistCount: number;
  onViewWishlist: () => void;
  onViewProfile: () => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentView,
  selectedCategory,
  onSetCurrentView,
  onSelectCategory,
  onOpenCart,
  cartItemsCount,
  wishlistCount,
  onViewWishlist,
  onViewProfile,
}) => {
  const handleHomeClick = () => {
    onSetCurrentView("browse");
    onSelectCategory("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCategoriesClick = () => {
    onSetCurrentView("browse");
    // Scroll to CategoryGrid
    const catGrid = document.getElementById("category-grid");
    if (catGrid) {
      catGrid.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      window.scrollTo({ top: 100, behavior: "smooth" });
    }
  };

  return (
    <div className="bottom-nav md:hidden">
      {/* Home Button */}
      <button 
        onClick={handleHomeClick}
        className={`bottom-nav-item ${currentView === "browse" && selectedCategory === "" ? "active" : ""}`}
      >
        <Home className="w-5.5 h-5.5" />
        <span>Home</span>
      </button>

      {/* Categories Button */}
      <button 
        onClick={handleCategoriesClick}
        className={`bottom-nav-item ${currentView === "browse" && selectedCategory !== "" ? "active" : ""}`}
      >
        <Grid className="w-5.5 h-5.5" />
        <span>Categories</span>
      </button>

      {/* Wishlist Button */}
      <button 
        onClick={onViewWishlist}
        className={`bottom-nav-item ${currentView === "dashboard" && window.location.hash === "#wishlist" ? "active" : ""}`}
      >
        <Heart className="w-5.5 h-5.5" />
        <span>Wishlist</span>
        {wishlistCount > 0 && (
          <span className="absolute top-0 right-4 bg-[#FF9F00] text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white">
            {wishlistCount}
          </span>
        )}
      </button>

      {/* Account Button */}
      <button 
        onClick={onViewProfile}
        className={`bottom-nav-item ${currentView === "dashboard" ? "active" : ""}`}
      >
        <User className="w-5.5 h-5.5" />
        <span>Account</span>
      </button>

      {/* Cart Button */}
      <button 
        onClick={onOpenCart}
        className="bottom-nav-item"
      >
        <ShoppingCart className="w-5.5 h-5.5" />
        <span>Cart</span>
        {cartItemsCount > 0 && (
          <span className="absolute top-0 right-4 bg-[#FF9F00] text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white">
            {cartItemsCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default BottomNavigation;
