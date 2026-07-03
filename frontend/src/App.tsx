import { useState, useEffect, lazy, Suspense } from "react";
import { Compass, Star, Filter, ChevronDown, X, ShieldCheck, Lock, MapPin, Bell, XCircle } from "lucide-react";
import { wsService } from "./services/websocket";
import { api } from "./services/api";
import logoSymbol from "./assets/logo_page_1.webp";
import { Header } from "./components/Header";
import { BottomNavigation } from "./components/BottomNavigation";
import { LocationModal } from "./components/LocationModal";
import { CategoryGrid } from "./components/CategoryGrid";
import { HeroBanner } from "./components/HeroBanner";
import { FlashSale } from "./components/FlashSale";
import { ProductCarousel } from "./components/ProductCarousel";
import { ProductCard } from "./components/ProductCard";
import { CartSidebar } from "./components/CartSidebar";
import { ProductDetails } from "./components/ProductDetails";
const AdminConsole = lazy(() => import("./components/AdminConsole").then(m => ({ default: m.AdminConsole })));
import { Dashboard } from "./components/Dashboard";

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

const getColorHex = (colorName: string) => {
  const name = colorName.toLowerCase();
  if (name.includes("rose gold")) return "#B76E79";
  if (name.includes("gold")) return "#C5A059";
  if (name.includes("silver")) return "#C0C0C0";
  if (name.includes("platinum")) return "#E5E4E2";
  if (name.includes("charcoal")) return "#1C1A17";
  if (name.includes("crimson")) return "#DC143C";
  if (name.includes("burgundy")) return "#5C1D24";
  if (name.includes("white")) return "#FFFFFF";
  if (name.includes("black")) return "#000000";
  if (name.includes("blue")) return "#0000FF";
  if (name.includes("green")) return "#008000";
  if (name.includes("pink")) return "#FFC0CB";
  if (name.includes("purple")) return "#800080";
  if (name.includes("yellow")) return "#FFFF00";
  return name;
};

function App() {
  // Toast notifications state
  interface Toast {
    id: number;
    message: string;
    type: "success" | "error" | "info" | "warning";
  }
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = (message: string, type: "success" | "error" | "info" | "warning" = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500); // Auto-dismiss after 4.5s
  };

  // Mock global window.alert with custom Toast system
  useEffect(() => {
    window.alert = (msg) => {
      if (!msg) return;
      const lower = msg.toLowerCase();
      let type: "success" | "error" | "info" | "warning" = "info";
      
      if (lower.includes("success") || lower.includes("added") || lower.includes("created")) {
        type = "success";
      } else if (lower.includes("log in") || lower.includes("login") || lower.includes("require") || lower.includes("please register")) {
        type = "warning";
      } else if (lower.includes("error") || lower.includes("failed") || lower.includes("invalid") || lower.includes("exceeds")) {
        type = "error";
      }
      
      showToast(msg, type);
    };
  }, []);

  // Navigation tabs
  const [currentView, setCurrentView] = useState<"browse" | "dashboard" | "admin">("browse");
  const [dashboardTab, setDashboardTab] = useState<"profile" | "addresses" | "wishlist" | "orders">("profile");

  // Sorting state
  const [sortBy, setSortBy] = useState<"popularity" | "newest" | "price_low_high" | "price_high_low" | "rating">("popularity");

  const handleViewWishlist = () => {
    if (!customerToken) {
      alert("Please log in to view your wishlist.");
      setCurrentView("dashboard");
      return;
    }
    setDashboardTab("wishlist");
    setCurrentView("dashboard");
  };

  const handleViewOrders = () => {
    if (!customerToken) {
      alert("Please log in to view your order history.");
      setCurrentView("dashboard");
      return;
    }
    setDashboardTab("orders");
    setCurrentView("dashboard");
  };

  const handleViewProfile = () => {
    if (!customerToken) {
      setCurrentView("dashboard");
      return;
    }
    setDashboardTab("profile");
    setCurrentView("dashboard");
  };
  
  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Cart states
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Location states
  const [locationPincode, setLocationPincode] = useState(localStorage.getItem("hb_pincode") || "Select Location");
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  // Detail overlay states
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  
  // Client state
  const [favorites, setFavorites] = useState<number[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<number[]>([]);
  const [wsStatus, setWsStatus] = useState<"connected" | "disconnected">("disconnected");
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  console.log("RENDER PRODUCTS LENGTH:", products.length);

  // Filter States
  const [filterPrice, setFilterPrice] = useState<number>(50000);
  const [filterBrands, setFilterBrands] = useState<string[]>([]);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [filterColors, setFilterColors] = useState<string[]>([]);
  const [filterSizes, setFilterSizes] = useState<string[]>([]);
  const [priceRangeTouched, setPriceRangeTouched] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Dynamic filter lists derived from products catalog
  const uniqueBrands = Array.from(
    new Set(products.map((p) => p.brand).filter(Boolean) as string[])
  ).sort();

  const uniqueColors = Array.from(
    new Set(
      products.flatMap((p) => {
        if (!p.variations) return [];
        return Object.entries(p.variations)
          .filter(([key]) => {
            const k = key.toLowerCase();
            return k.includes("color") || k.includes("shade") || k.includes("hue");
          })
          .flatMap(([_, values]) => values);
      })
    )
  ).sort();

  const uniqueSizes = Array.from(
    new Set(
      products.flatMap((p) => {
        if (!p.variations) return [];
        return Object.entries(p.variations)
          .filter(([key]) => {
            const k = key.toLowerCase();
            return k.includes("size") || k.includes("length") || k.includes("dimension") || k.includes("weight");
          })
          .flatMap(([_, values]) => values);
      })
    )
  ).sort();

  const maxProductPrice = products.length > 0
    ? Math.ceil(Math.max(...products.map(p => {
        const discountAmount = p.discount > 0 ? (p.price * p.discount) / 100 : 0;
        return p.price - discountAmount;
      })))
    : 50000;

  useEffect(() => {
    if (products.length > 0 && !priceRangeTouched) {
      const maxPrice = Math.max(...products.map(p => {
        const discountAmount = p.discount > 0 ? (p.price * p.discount) / 100 : 0;
        return p.price - discountAmount;
      }));
      setFilterPrice(Math.ceil(maxPrice));
    }
  }, [products, priceRangeTouched]);

  const handleResetFilters = () => {
    setFilterBrands([]);
    setFilterRating(null);
    setFilterColors([]);
    setFilterSizes([]);
    setPriceRangeTouched(false);
    if (products.length > 0) {
      const maxPrice = Math.max(...products.map(p => {
        const discountAmount = p.discount > 0 ? (p.price * p.discount) / 100 : 0;
        return p.price - discountAmount;
      }));
      setFilterPrice(Math.ceil(maxPrice));
    } else {
      setFilterPrice(50000);
    }
  };

  const removeFilterTag = (type: string, value?: any) => {
    if (type === "brand") {
      setFilterBrands(prev => prev.filter(b => b !== value));
    } else if (type === "rating") {
      setFilterRating(null);
    } else if (type === "color") {
      setFilterColors(prev => prev.filter(c => c !== value));
    } else if (type === "size") {
      setFilterSizes(prev => prev.filter(s => s !== value));
    } else if (type === "price") {
      setPriceRangeTouched(false);
      if (products.length > 0) {
        const maxPrice = Math.max(...products.map(p => {
          const discountAmount = p.discount > 0 ? (p.price * p.discount) / 100 : 0;
          return p.price - discountAmount;
        }));
        setFilterPrice(Math.ceil(maxPrice));
      }
    }
  };

  // Lifted Customer Login state
  const [customerToken, setCustomerToken] = useState<string | null>(localStorage.getItem("hb_cust_token"));
  const [customerData, setCustomerData] = useState<any>(
    JSON.parse(localStorage.getItem("hb_cust_data") || "null")
  );
  const [customerPhone, setCustomerPhone] = useState<string | null>(localStorage.getItem("hb_cust_phone"));

  const handleCustomerLogin = (token: string, userData: any) => {
    localStorage.setItem("hb_cust_token", token);
    localStorage.setItem("hb_cust_data", JSON.stringify(userData));
    localStorage.setItem("hb_cust_phone", userData.phone);
    setCustomerToken(token);
    setCustomerData(userData);
    setCustomerPhone(userData.phone);
    if (userData.wishlist) {
      setFavorites(userData.wishlist);
      localStorage.setItem("hb_favorites", JSON.stringify(userData.wishlist));
    }
  };

  const handleCustomerLogout = () => {
    localStorage.removeItem("hb_cust_token");
    localStorage.removeItem("hb_cust_data");
    localStorage.removeItem("hb_cust_phone");
    localStorage.removeItem("hb_favorites");
    setCustomerToken(null);
    setCustomerData(null);
    setCustomerPhone(null);
    setFavorites([]);
  };

  // Sync profile/wishlist on token load
  useEffect(() => {
    if (customerToken) {
      api.customerGetProfile(customerToken)
        .then((profile) => {
          setCustomerData(profile);
          localStorage.setItem("hb_cust_data", JSON.stringify(profile));
          if (profile.wishlist) {
            setFavorites(profile.wishlist);
            localStorage.setItem("hb_favorites", JSON.stringify(profile.wishlist));
          }
        })
        .catch((err) => {
          console.error("Session expired or invalid:", err);
          handleCustomerLogout();
        });
    }
  }, [customerToken]);

  // Load products, favorites, recently viewed, and cart on mount
  useEffect(() => {
    fetchProducts();
    
    // Load local favorites
    const savedFavs = JSON.parse(localStorage.getItem("hb_favorites") || "[]");
    setFavorites(savedFavs);

    // Load local recently viewed
    const savedRecentlyViewed = JSON.parse(localStorage.getItem("hb_recently_viewed") || "[]");
    setRecentlyViewed(savedRecentlyViewed);
    
    // Load local cart
    const savedCart = JSON.parse(localStorage.getItem("hb_cart") || "[]");
    setCart(savedCart);
    
    // Initialize WebSocket connection
    wsService.connect();
    setWsStatus("connected");

    // Subscribe to WebSocket events
    const unsubCreated = wsService.subscribe("product_created", (msg) => {
      setProducts((prev) => {
        if (prev.some(p => p.id === msg.product.id)) return prev;
        return [...prev, msg.product];
      });
    });

    const unsubUpdated = wsService.subscribe("product_updated", (msg) => {
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === msg.product_id) {
            return {
              ...p,
              ...msg,
              id: p.id,
              views: msg.views !== undefined ? msg.views : p.views,
              clicks: msg.clicks !== undefined ? msg.clicks : p.clicks,
            };
          }
          return p;
        })
      );
      
      setActiveProduct((prev) => {
        if (prev && prev.id === msg.product_id) {
          return { ...prev, ...msg };
        }
        return prev;
      });
    });

    const unsubDeleted = wsService.subscribe("product_deleted", (msg) => {
      setProducts((prev) => prev.filter((p) => p.id !== msg.product_id));
      setActiveProduct((prev) => (prev?.id === msg.product_id ? null : prev));
    });

    const unsubViewed = wsService.subscribe("product_viewed", (msg) => {
      setProducts((prev) =>
        prev.map((p) => (p.id === msg.product_id ? { ...p, views: msg.views } : p))
      );
      setActiveProduct((prev) => {
        if (prev && prev.id === msg.product_id) {
          return { ...prev, views: msg.views };
        }
        return prev;
      });
    });

    const unsubClicked = wsService.subscribe("product_clicked", (msg) => {
      setProducts((prev) =>
        prev.map((p) => (p.id === msg.product_id ? { ...p, clicks: msg.clicks } : p))
      );
      setActiveProduct((prev) => {
        if (prev && prev.id === msg.product_id) {
          return { ...prev, clicks: msg.clicks };
        }
        return prev;
      });
    });

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubDeleted();
      unsubViewed();
      unsubClicked();
      wsService.disconnect();
    };
  }, []);

  const fetchProducts = async () => {
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch (err) {
      console.error("Error loading products:", err);
    }
  };

  const handleToggleFavorite = (productId: number) => {
    if (!customerToken) {
      alert("Please log in to add items to your wishlist.");
      setCurrentView("dashboard");
      return;
    }
    setFavorites((prev) => {
      const updated = prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId];
      localStorage.setItem("hb_favorites", JSON.stringify(updated));
      
      if (customerToken) {
        api.customerUpdateWishlist(customerToken, updated).catch((err) => {
          console.error("Failed to sync wishlist to DB:", err);
        });
      }
      return updated;
    });
  };

  // Cart Operations
  const handleAddToCart = (product: Product, quantity: number, variations: Record<string, string>) => {
    if (!customerToken) {
      alert("Please log in to add items to your cart.");
      setCurrentView("dashboard");
      return;
    }
    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (item) => 
          item.product.id === product.id && 
          JSON.stringify(item.variations) === JSON.stringify(variations)
      );

      let updated;
      if (existingIdx > -1) {
        updated = [...prev];
        updated[existingIdx].quantity += quantity;
      } else {
        updated = [...prev, { product, quantity, variations }];
      }
      localStorage.setItem("hb_cart", JSON.stringify(updated));
      return updated;
    });
  };

  const handleBuyNow = (product: Product, quantity: number, variations: Record<string, string>) => {
    if (!customerToken) {
      alert("Please log in to purchase products.");
      setCurrentView("dashboard");
      setActiveProduct(null);
      return;
    }
    // Add to cart (since token is verified, this will succeed)
    handleAddToCart(product, quantity, variations);
    // Close detail modal
    setActiveProduct(null);
    // Open the cart sidebar
    setIsCartOpen(true);
  };

  const handleRemoveFromCart = (index: number) => {
    setCart((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      localStorage.setItem("hb_cart", JSON.stringify(updated));
      return updated;
    });
  };

  const handleUpdateCartQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveFromCart(index);
      return;
    }
    setCart((prev) => {
      const updated = [...prev];
      if (newQty <= updated[index].product.stock) {
        updated[index].quantity = newQty;
      }
      localStorage.setItem("hb_cart", JSON.stringify(updated));
      return updated;
    });
  };

  const cartTotalVal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  const handleCheckoutSubmit = async (name: string, phone: string, address: string, couponCode: string = "") => {
    const orderItems = cart.map(item => ({
      product_id: item.product.id,
      name: item.product.name,
      quantity: item.quantity,
      price: item.product.price,
      chosen_variation: item.variations
    }));

    let discountPct = 0;
    const code = couponCode.trim().toUpperCase();
    if (code === "WELCOME10") discountPct = 10;
    else if (code === "BEAUTY15") discountPct = 15;
    else if (code === "FIRST20") discountPct = 20;

    const data = await api.createOrder({
      customer_name: name,
      phone: phone,
      address: address,
      items: orderItems,
      total_price: cartTotalVal,
      coupon_code: couponCode
    }, customerToken || undefined);
    
    localStorage.setItem("hb_customer_name", name);
    localStorage.setItem("hb_customer_phone", phone);
    localStorage.setItem("hb_customer_address", address);

    const customerOrdersLog = JSON.parse(localStorage.getItem("hb_customer_orders") || "[]");
    cart.forEach(item => {
      customerOrdersLog.push({
        id: data.order_id,
        date: new Date().toISOString(),
        productName: item.product.name,
        imageUrl: item.product.image_url,
        price: item.product.price * (1 - discountPct / 100),
        quantity: item.quantity,
        variations: item.variations,
        whatsappUrl: data.whatsapp_url,
        status: "Pending"
      });
    });
    localStorage.setItem("hb_customer_orders", JSON.stringify(customerOrdersLog));

    window.open(data.whatsapp_url, "_blank");

    setCart([]);
    localStorage.removeItem("hb_cart");
    setIsCartOpen(false);
    setCurrentView("dashboard");
    alert("Order created! Check your WhatsApp window to send details.");
  };

  const handleSaveLocation = (city: string, pincode: string) => {
    const locStr = `${city} - ${pincode}`;
    setLocationPincode(locStr);
    localStorage.setItem("hb_pincode", locStr);
    setIsLocationModalOpen(false);
  };

  const handleOpenDetails = async (product: Product) => {
    setActiveProduct(product);

    // Track recently viewed
    setRecentlyViewed((prev) => {
      const filtered = prev.filter((id) => id !== product.id);
      const updated = [product.id, ...filtered].slice(0, 10);
      localStorage.setItem("hb_recently_viewed", JSON.stringify(updated));
      return updated;
    });

    try {
      const detailed = await api.getProduct(product.id);
      setActiveProduct(detailed);
    } catch (err) {
      console.error(err);
    }
  };

  // Dynamic Product Collections sorting
  const trendingProducts = [...products]
    .sort((a, b) => (b.views + b.clicks) - (a.views + a.clicks))
    .slice(0, 8);

  const bestSellers = [...products]
    .filter(p => p.stock > 0)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 8);

  const newArrivals = [...products]
    .sort((a, b) => b.id - a.id)
    .slice(0, 8);

  const recentlyViewedProducts = recentlyViewed
    .map(id => products.find(p => p.id === id))
    .filter(Boolean) as Product[];

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const discountAmount = p.discount > 0 ? (p.price * p.discount) / 100 : 0;
    const effectivePrice = p.price - discountAmount;
    const matchesPrice = effectivePrice <= filterPrice;

    const matchesBrand = filterBrands.length === 0 || (p.brand !== null && filterBrands.includes(p.brand));
    
    const matchesRating = filterRating === null || p.rating >= filterRating;

    const matchesColor = filterColors.length === 0 || (p.variations !== null && Object.entries(p.variations).some(([key, values]) => {
      const k = key.toLowerCase();
      return (k.includes("color") || k.includes("shade") || k.includes("hue")) && values.some(v => filterColors.includes(v));
    }));

    const matchesSize = filterSizes.length === 0 || (p.variations !== null && Object.entries(p.variations).some(([key, values]) => {
      const k = key.toLowerCase();
      return (k.includes("size") || k.includes("length") || k.includes("dimension") || k.includes("weight")) && values.some(v => filterSizes.includes(v));
    }));

    return matchesCategory && matchesSearch && matchesPrice && matchesBrand && matchesRating && matchesColor && matchesSize;
  });
  console.log("FILTERED PRODUCTS LENGTH:", filteredProducts.length, "filterPrice:", filterPrice, "filterBrands:", filterBrands, "filterRating:", filterRating, "filterColors:", filterColors, "filterSizes:", filterSizes);

  const sortedFilteredProducts = [...filteredProducts].sort((a, b) => {
    const getEffectivePrice = (p: Product) => {
      const discountAmount = p.discount > 0 ? (p.price * p.discount) / 100 : 0;
      return p.price - discountAmount;
    };

    if (sortBy === "newest") {
      return b.id - a.id;
    }
    if (sortBy === "price_low_high") {
      return getEffectivePrice(a) - getEffectivePrice(b);
    }
    if (sortBy === "price_high_low") {
      return getEffectivePrice(b) - getEffectivePrice(a);
    }
    if (sortBy === "rating") {
      return b.rating - a.rating;
    }
    // popularity default
    return (b.views + b.clicks) - (a.views + a.clicks);
  });

  return (
    <div className="min-h-screen flex flex-col font-sans bg-gray-50 text-charcoal pb-20 md:pb-0">
      
      {/* Sticky Header */}
      <Header
        currentView={currentView}
        onSetCurrentView={setCurrentView}
        locationPincode={locationPincode}
        onOpenLocationModal={() => setIsLocationModalOpen(true)}
        searchQuery={searchQuery}
        onSetSearchQuery={setSearchQuery}
        customerPhone={customerPhone}
        onLogout={handleCustomerLogout}
        onOpenCart={() => setIsCartOpen(true)}
        cartItemsCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        wishlistCount={favorites.length}
        onViewWishlist={handleViewWishlist}
        onViewOrders={handleViewOrders}
        onViewProfile={handleViewProfile}
      />

      {/* Main Content */}
      <main className="flex-grow container py-4 pb-12 space-y-8">
        
        {currentView === "browse" && (
          <div className="space-y-6 md:space-y-8 animate-fade-in">
            {/* Banner Promotional Carousel */}
            <HeroBanner />

            {/* Category Grid */}
            <div id="category-grid">
              <CategoryGrid
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
              />
            </div>

            {selectedCategory === "All" ? (
              <>
                {/* Flash Sale Section */}
                <FlashSale
                  products={products}
                  onSelectProduct={handleOpenDetails}
                />

                {/* Trending Products */}
                <ProductCarousel
                  title="Trending Products"
                  products={trendingProducts}
                  favorites={favorites}
                  onToggleFavorite={handleToggleFavorite}
                  onSelectProduct={handleOpenDetails}
                  onAddToCart={handleAddToCart}
                />

                {/* Best Sellers */}
                <ProductCarousel
                  title="Best Sellers"
                  products={bestSellers}
                  favorites={favorites}
                  onToggleFavorite={handleToggleFavorite}
                  onSelectProduct={handleOpenDetails}
                  onAddToCart={handleAddToCart}
                />

                {/* New Arrivals */}
                <ProductCarousel
                  title="New Arrivals"
                  products={newArrivals}
                  favorites={favorites}
                  onToggleFavorite={handleToggleFavorite}
                  onSelectProduct={handleOpenDetails}
                  onAddToCart={handleAddToCart}
                />

                {/* Recently Viewed */}
                <ProductCarousel
                  title="Recently Viewed"
                  products={recentlyViewedProducts}
                  favorites={favorites}
                  onToggleFavorite={handleToggleFavorite}
                  onSelectProduct={handleOpenDetails}
                  onAddToCart={handleAddToCart}
                />

                {/* Shop All Collections */}
                <div id="shop-listings" className="flex items-center justify-between border-b border-gray-150 pb-3 pt-4">
                  <h2 className="text-2xl font-serif text-charcoal">
                    Shop All Collections
                  </h2>
                  <span className="text-xs text-gray-500 font-sans font-medium">
                    {filteredProducts.length} items found
                  </span>
                </div>
              </>
            ) : (
              <div id="shop-listings" className="flex items-center justify-between border-b border-gray-150 pb-3 pt-4">
                <h2 className="text-2xl font-serif text-charcoal">
                  Shop {selectedCategory} Collections
                </h2>
                <span className="text-xs text-gray-500 font-sans font-medium">
                  {filteredProducts.length} items found
                </span>
              </div>
            )}

            {/* Backdrop Overlay for closing active filter dropdowns */}
            {activeDropdown !== null && (
              <div 
                className="fixed inset-0 z-40 bg-transparent"
                onClick={() => setActiveDropdown(null)}
              />
            )}

            {/* Modern Top Filter & Sort Bar */}
            <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm space-y-4 relative z-20">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                {/* Filters Row */}
                <div className="flex flex-nowrap md:flex-wrap overflow-x-auto md:overflow-x-visible no-scrollbar items-center gap-2.5 pb-2 md:pb-0 scroll-smooth w-full md:w-auto">
                  <div className="flex items-center gap-1.5 text-gray-500 font-bold uppercase tracking-wider text-[10px] mr-1.5 flex-shrink-0">
                    <Filter className="w-3.5 h-3.5 text-[#2874F0]" />
                    Filters:
                  </div>

                  {/* Price Filter */}
                  <div className="relative">
                    <button
                      onClick={() => setActiveDropdown(activeDropdown === "price" ? null : "price")}
                      className={`px-4 py-2 bg-white border rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        priceRangeTouched
                          ? "border-[#2874F0] text-[#2874F0] bg-[#E3EDFC]"
                          : "border-gray-200 text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <span>Price {priceRangeTouched ? `(Under ₹${filterPrice.toLocaleString("en-IN")})` : ""}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                    </button>

                    {activeDropdown === "price" && (
                      <div className="absolute left-0 mt-2 w-64 bg-white border border-gray-200 rounded-2xl p-4 shadow-xl z-50 animate-fade-in space-y-3">
                        <div className="flex justify-between text-[10px] text-gray-500 font-medium">
                          <span>Min: ₹0</span>
                          <span>Max: ₹${maxProductPrice.toLocaleString("en-IN")}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max={maxProductPrice}
                          value={filterPrice}
                          onChange={(e) => {
                            setFilterPrice(Number(e.target.value));
                            setPriceRangeTouched(true);
                          }}
                          className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          style={{ accentColor: "#2874F0" }}
                        />
                        <div className="flex justify-between items-center pt-1">
                          <span className="text-xs text-[#2874F0] font-bold">
                            Under ₹${filterPrice.toLocaleString("en-IN")}
                          </span>
                          {priceRangeTouched && (
                            <button
                              onClick={() => {
                                setPriceRangeTouched(false);
                                setFilterPrice(maxProductPrice);
                                setActiveDropdown(null);
                              }}
                              className="text-[10px] text-red-500 font-bold hover:underline"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Brand Filter */}
                  {uniqueBrands.length > 0 && (
                    <div className="relative">
                      <button
                        onClick={() => setActiveDropdown(activeDropdown === "brands" ? null : "brands")}
                        className={`px-4 py-2 bg-white border rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          filterBrands.length > 0
                            ? "border-[#2874F0] text-[#2874F0] bg-[#E3EDFC]"
                            : "border-gray-200 text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        <span>Brand {filterBrands.length > 0 ? `(${filterBrands.length})` : ""}</span>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                      </button>

                      {activeDropdown === "brands" && (
                        <div className="absolute left-0 mt-2 w-56 bg-white border border-gray-200 rounded-2xl p-4 shadow-xl z-50 animate-fade-in max-h-60 overflow-y-auto no-scrollbar">
                          {uniqueBrands.map((brand) => (
                            <label key={brand} className="flex items-center gap-2 cursor-pointer text-xs text-gray-600 hover:text-charcoal transition-colors py-1.5">
                              <input
                                type="checkbox"
                                checked={filterBrands.includes(brand)}
                                onChange={() => {
                                  setFilterBrands(prev =>
                                    prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]
                                  );
                                  setPriceRangeTouched(true);
                                }}
                                className="rounded border-gray-300 text-[#2874F0] focus:ring-[#2874F0]"
                                style={{ width: "15px", height: "15px", accentColor: "#2874F0" }}
                              />
                              <span className="select-none font-medium">{brand}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Rating Filter */}
                  <div className="relative">
                    <button
                      onClick={() => setActiveDropdown(activeDropdown === "rating" ? null : "rating")}
                      className={`px-4 py-2 bg-white border rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        filterRating !== null
                          ? "border-[#2874F0] text-[#2874F0] bg-[#E3EDFC]"
                          : "border-gray-200 text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <span>Rating {filterRating !== null ? `(${filterRating}★ & Up)` : ""}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                    </button>

                    {activeDropdown === "rating" && (
                      <div className="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded-2xl p-2 shadow-xl z-50 animate-fade-in space-y-0.5">
                        {[4, 3, 2, 1].map((stars) => {
                          const count = products.filter(p => p.rating >= stars).length;
                          return (
                            <button
                              key={stars}
                              onClick={() => {
                                setFilterRating(filterRating === stars ? null : stars);
                                setActiveDropdown(null);
                              }}
                              className={`flex items-center gap-2 w-full text-left py-2 px-2.5 rounded-xl transition-all text-xs ${
                                filterRating === stars
                                  ? "bg-[#E3EDFC] text-[#2874F0] font-bold"
                                  : "text-gray-600 hover:bg-gray-50"
                              }`}
                            >
                              <div className="flex items-center gap-0.5 flex-shrink-0">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className="w-3.5 h-3.5"
                                    style={{
                                      color: i < stars ? '#FF9F00' : '#E0E0E0',
                                      fill: i < stars ? '#FF9F00' : 'transparent'
                                    }}
                                  />
                                ))}
                              </div>
                              <span className="select-none text-[10px]">& Up ({count})</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Colors Filter */}
                  {uniqueColors.length > 0 && (
                    <div className="relative">
                      <button
                        onClick={() => setActiveDropdown(activeDropdown === "colors" ? null : "colors")}
                        className={`px-4 py-2 bg-white border rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          filterColors.length > 0
                            ? "border-[#2874F0] text-[#2874F0] bg-[#E3EDFC]"
                            : "border-gray-200 text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        <span>Color {filterColors.length > 0 ? `(${filterColors.length})` : ""}</span>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                      </button>

                      {activeDropdown === "colors" && (
                        <div className="absolute left-0 mt-2 w-56 bg-white border border-gray-200 rounded-2xl p-4 shadow-xl z-50 animate-fade-in max-h-60 overflow-y-auto no-scrollbar">
                          {uniqueColors.map((color) => (
                            <label key={color} className="flex items-center gap-2 cursor-pointer text-xs text-gray-600 hover:text-charcoal transition-colors py-1.5">
                              <input
                                type="checkbox"
                                checked={filterColors.includes(color)}
                                onChange={() => {
                                  setFilterColors(prev =>
                                    prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]
                                  );
                                }}
                                className="rounded border-gray-300 text-[#2874F0] focus:ring-[#2874F0]"
                                style={{ width: "15px", height: "15px", accentColor: "#2874F0" }}
                              />
                              <span 
                                className="w-3.5 h-3.5 rounded-full border border-gray-200 flex-shrink-0"
                                style={{ backgroundColor: getColorHex(color) }}
                              />
                              <span className="select-none font-medium">{color}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sizes Filter */}
                  {uniqueSizes.length > 0 && (
                    <div className="relative">
                      <button
                        onClick={() => setActiveDropdown(activeDropdown === "sizes" ? null : "sizes")}
                        className={`px-4 py-2 bg-white border rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          filterSizes.length > 0
                            ? "border-[#2874F0] text-[#2874F0] bg-[#E3EDFC]"
                            : "border-gray-200 text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        <span>Size {filterSizes.length > 0 ? `(${filterSizes.length})` : ""}</span>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                      </button>

                      {activeDropdown === "sizes" && (
                        <div className="absolute left-0 mt-2 w-52 bg-white border border-gray-200 rounded-2xl p-4 shadow-xl z-50 animate-fade-in max-h-60 overflow-y-auto no-scrollbar">
                          {uniqueSizes.map((size) => (
                            <label key={size} className="flex items-center gap-2 cursor-pointer text-xs text-gray-600 hover:text-charcoal transition-colors py-1.5">
                              <input
                                type="checkbox"
                                checked={filterSizes.includes(size)}
                                onChange={() => {
                                  setFilterSizes(prev =>
                                    prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
                                  );
                                }}
                                className="rounded border-gray-300 text-[#2874F0] focus:ring-[#2874F0]"
                                style={{ width: "15px", height: "15px", accentColor: "#2874F0" }}
                              />
                              <span className="select-none font-medium">{size}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Sort By Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setActiveDropdown(activeDropdown === "sort" ? null : "sort")}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-full text-xs font-semibold flex items-center gap-1.5 text-gray-700 hover:border-gray-300 transition-all"
                  >
                    <span className="text-gray-400 font-normal">Sort By:</span>
                    <span>
                      {sortBy === "popularity" && "Popularity"}
                      {sortBy === "newest" && "Newest"}
                      {sortBy === "price_low_high" && "Price: Low to High"}
                      {sortBy === "price_high_low" && "Price: High to Low"}
                      {sortBy === "rating" && "Top Rated"}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  </button>

                  {activeDropdown === "sort" && (
                    <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-200 rounded-2xl p-1 shadow-xl z-50 animate-fade-in">
                      {[
                        { id: "popularity", label: "Popularity" },
                        { id: "newest", label: "Newest" },
                        { id: "price_low_high", label: "Price: Low to High" },
                        { id: "price_high_low", label: "Price: High to Low" },
                        { id: "rating", label: "Top Rated" }
                      ].map((option) => (
                        <button
                          key={option.id}
                          onClick={() => {
                            setSortBy(option.id as any);
                            setActiveDropdown(null);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-xs font-medium rounded-xl transition-all ${
                            sortBy === option.id
                              ? "bg-[#E3EDFC] text-[#2874F0] font-bold"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Active Filter Tags */}
              {(filterBrands.length > 0 || filterRating !== null || filterColors.length > 0 || filterSizes.length > 0 || priceRangeTouched) && (
                <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3.5 font-sans text-[10px]">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[9px] mr-1">Active Filters:</span>
                  {priceRangeTouched && (
                    <span className="flex items-center gap-1.5 bg-[#E3EDFC] text-[#2874F0] px-2.5 py-1 rounded-full font-bold border border-[#2874F0]/10 shadow-sm">
                      Price: Under ₹${filterPrice.toLocaleString("en-IN")}
                      <button onClick={() => removeFilterTag("price")} className="hover:text-red-500 transition-colors">
                        <X className="w-3 h-3 text-red-500" />
                      </button>
                    </span>
                  )}
                  {filterBrands.map((brand) => (
                    <span key={brand} className="flex items-center gap-1.5 bg-[#E3EDFC] text-[#2874F0] px-2.5 py-1 rounded-full font-bold border border-[#2874F0]/10 shadow-sm">
                      Brand: {brand}
                      <button onClick={() => removeFilterTag("brand", brand)} className="hover:text-red-500 transition-colors">
                        <X className="w-3 h-3 text-red-500" />
                      </button>
                    </span>
                  ))}
                  {filterRating !== null && (
                    <span className="flex items-center gap-1.5 bg-[#E3EDFC] text-[#2874F0] px-2.5 py-1 rounded-full font-bold border border-[#2874F0]/10 shadow-sm">
                      Rating: {filterRating}★ & Up
                      <button onClick={() => removeFilterTag("rating")} className="hover:text-red-500 transition-colors">
                        <X className="w-3 h-3 text-red-500" />
                      </button>
                    </span>
                  )}
                  {filterColors.map((color) => (
                    <span key={color} className="flex items-center gap-1.5 bg-[#E3EDFC] text-[#2874F0] px-2.5 py-1 rounded-full font-bold border border-[#2874F0]/10 shadow-sm">
                      Color: {color}
                      <button onClick={() => removeFilterTag("color", color)} className="hover:text-red-500 transition-colors">
                        <X className="w-3 h-3 text-red-500" />
                      </button>
                    </span>
                  ))}
                  {filterSizes.map((size) => (
                    <span key={size} className="flex items-center gap-1.5 bg-[#E3EDFC] text-[#2874F0] px-2.5 py-1 rounded-full font-bold border border-[#2874F0]/10 shadow-sm">
                      Size: {size}
                      <button onClick={() => removeFilterTag("size", size)} className="hover:text-red-500 transition-colors">
                        <X className="w-3 h-3 text-red-500" />
                      </button>
                    </span>
                  ))}
                  <button
                    onClick={handleResetFilters}
                    className="text-[10px] text-red-500 hover:underline font-bold transition-all px-2 py-1 ml-1"
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
              {sortedFilteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isFavorite={favorites.includes(product.id)}
                  onToggleFavorite={handleToggleFavorite}
                  onSelectProduct={handleOpenDetails}
                  onAddToCart={handleAddToCart}
                />
              ))}
              {sortedFilteredProducts.length === 0 && (
                <div className="col-span-full text-center py-20 bg-white border border-gray-200 rounded-3xl text-gray-400">
                  <Compass className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="font-semibold text-sm">No items found matching your filters</p>
                </div>
              )}
            </div>
            {/* Shop By Brand Section */}
            {selectedCategory === "All" && (
              <div className="space-y-4 pt-5 border-t border-[#E8E5DF]">
                <div className="text-center max-w-xl mx-auto space-y-2">
                  <span className="text-[10px] uppercase tracking-widest text-[#C5A059] font-bold">Curated Partners</span>
                  <h3 className="text-2xl font-serif text-charcoal">Shop By Brand</h3>
                  <p className="text-xs text-gray-500 font-medium">Explore premium authentic cosmetics and skincare from global beauty leaders</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { name: "Lakme", logo: "💄", tag: "Lakme Absolute" },
                    { name: "Maybelline", logo: "👁️", tag: "Fit Me" },
                    { name: "Mamaearth", logo: "🌿", tag: "Natural Care" },
                    { name: "Sugar", logo: "💋", tag: "Smudge Free" }
                  ].map((brand) => (
                    <button
                      key={brand.name}
                      onClick={() => {
                        setFilterBrands(prev => 
                          prev.includes(brand.name) ? prev.filter(b => b !== brand.name) : [brand.name]
                        );
                        setPriceRangeTouched(true);
                        const listEl = document.getElementById("shop-listings");
                        if (listEl) {
                          listEl.scrollIntoView({ behavior: "smooth" });
                        }
                      }}
                      className={`p-6 bg-white border rounded-3xl flex flex-col items-center gap-3 transition-all duration-300 transform hover:-translate-y-1 ${
                        filterBrands.includes(brand.name)
                          ? "border-[#C5A059] ring-2 ring-[#C5A059]/10 bg-[#F7F5F0]"
                          : "border-[#E8E5DF] hover:border-gray-300 hover:shadow-premium"
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full bg-[#F3EBE0] flex items-center justify-center text-xl text-[#A8833E]">
                        {brand.logo}
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-sm text-charcoal">{brand.name}</p>
                        <p className="text-[9px] text-gray-400 font-medium uppercase mt-0.5">{brand.tag}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Customer Reviews Section */}
            {selectedCategory === "All" && (
              <div className="space-y-4 pt-5 border-t border-[#E8E5DF]">
                <div className="text-center max-w-xl mx-auto space-y-2">
                  <span className="text-[10px] uppercase tracking-widest text-[#C5A059] font-bold">Happy Customers</span>
                  <h3 className="text-2xl font-serif text-charcoal">Real Reviews, Real Glow</h3>
                  <p className="text-xs text-gray-500 font-medium">Hear from our community about their signature styles and results</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    {
                      name: "Ananya Sharma",
                      rating: 5,
                      text: "The Aura Gold Chain is absolutely gorgeous. The 18K plating is durable, and I've been wearing it daily without any tarnishing!",
                      date: "2 days ago",
                      item: "Aura Gold Chain"
                    },
                    {
                      name: "Priya Patel",
                      rating: 5,
                      text: "Maybelline Fit Me foundation gives a seamless finish that lasts all day in the hot summer heat. Best purchase from Hellobeauty!",
                      date: "1 week ago",
                      item: "Maybelline Fit Me Foundation"
                    },
                    {
                      name: "Sneha Reddy",
                      rating: 4,
                      text: "Mamaearth Vitamin C Serum has significantly brightened my skin tone in just a couple of weeks. Highly recommend this for daily skincare.",
                      date: "3 days ago",
                      item: "Mamaearth Vitamin C Serum"
                    }
                  ].map((rev, i) => (
                    <div key={i} className="bg-white p-6 border border-[#E8E5DF] rounded-3xl space-y-4 shadow-sm hover:shadow-premium transition-all duration-300">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-0.5">
                          {[...Array(rev.rating)].map((_, starIdx) => (
                            <Star
                              key={starIdx}
                              className="w-3.5 h-3.5"
                              style={{ color: '#FF9F00', fill: '#FF9F00' }}
                            />
                          ))}
                        </div>
                        <span className="text-[9px] text-gray-400 font-medium">{rev.date}</span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed italic">"{rev.text}"</p>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[10px]">
                        <span className="font-bold text-charcoal">{rev.name}</span>
                        <span className="text-[#C5A059] font-medium truncate max-w-[120px]">{rev.item}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {currentView === "dashboard" && (
          <Dashboard 
            products={products}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            onSelectProduct={handleOpenDetails}
            customerToken={customerToken}
            customerData={customerData}
            onLogin={handleCustomerLogin}
            onLogout={handleCustomerLogout}
            onUpdateWishlist={setFavorites}
            onAddToCart={handleAddToCart}
            initialTab={dashboardTab}
          />
        )}

        {currentView === "admin" && (
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-[50vh]">
              <div className="w-8 h-8 border-4 border-[#2874F0] border-t-transparent rounded-full animate-spin" />
            </div>
          }>
            <AdminConsole />
          </Suspense>
        )}
      </main>

      {/* Slide-over Shopping Cart Panel */}
      <CartSidebar
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateCartQuantity={handleUpdateCartQuantity}
        onRemoveFromCart={handleRemoveFromCart}
        onCheckoutSubmit={handleCheckoutSubmit}
        customerToken={customerToken}
        customerData={customerData}
      />

      {/* Location Picker Modal */}
      {isLocationModalOpen && (
        <LocationModal
          onClose={() => setIsLocationModalOpen(false)}
          onSave={handleSaveLocation}
        />
      )}

      {/* Bottom Navigation for mobile viewports */}
      <BottomNavigation
        currentView={currentView}
        selectedCategory={selectedCategory}
        onSetCurrentView={setCurrentView}
        onSelectCategory={setSelectedCategory}
        onOpenCart={() => setIsCartOpen(true)}
        cartItemsCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        wishlistCount={favorites.length}
        onViewWishlist={handleViewWishlist}
        onViewProfile={handleViewProfile}
      />

      {/* Floating details overlay panel */}
      {activeProduct && (
        <ProductDetails
          product={activeProduct}
          isFavorite={favorites.includes(activeProduct.id)}
          onToggleFavorite={handleToggleFavorite}
          onClose={() => setActiveProduct(null)}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
        />
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-[#E5E7EB] text-[#6B7280] py-12 md:py-16 mt-auto text-xs font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 space-y-10">
          
          {/* Top Row: Newsletter Subscription Banner */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-[#E5E7EB]">
            <div className="space-y-1 max-w-md">
              <h4 className="font-bold text-sm text-[#111827] uppercase tracking-wider">Join Our Beauty Club</h4>
              <p className="text-[11px] text-[#6B7280] leading-relaxed">
                Get exclusive offers, early access, and beauty tips directly to your inbox.
              </p>
            </div>
            <div className="w-full md:w-auto flex-shrink-0">
              {newsletterSubscribed ? (
                <div className="bg-[#E3EDFC] border border-[#2874F0]/20 rounded-2xl px-4 py-2.5 text-[#2874F0] text-[11px] font-semibold flex items-center gap-2 animate-fade-in">
                  <span>✓</span>
                  <span>Subscribed! Check your inbox for beauty tips.</span>
                </div>
              ) : (
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (newsletterEmail.trim()) {
                      setNewsletterSubscribed(true);
                    }
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="email"
                    required
                    placeholder="Enter your email..."
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#2874F0] text-[11px] w-64 shadow-sm transition-all duration-200"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#2874F0] hover:bg-[#1a62d6] text-white font-bold text-[11px] transition-all duration-200 active:scale-95 shadow-md flex-shrink-0"
                  >
                    Subscribe
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Main Footer Links & Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            
            {/* Column 1: Brand Information & Social Media */}
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <img 
                  src={logoSymbol} 
                  alt="Hellobeauty Logo" 
                  className="w-8 h-8 object-contain"
                />
                <span className="font-bold text-lg text-[#111827] tracking-tight">
                  hello<span className="text-[#FF9F00]">beauty</span>
                </span>
              </div>
              <p className="leading-relaxed text-[11px] text-[#6B7280]">
                India’s trusted beauty and fashion marketplace offering premium cosmetics, skincare, jewelry, and lifestyle products.
              </p>
              <p className="leading-relaxed text-[11px] text-[#6B7280]">
                We bring authentic brands, secure shopping, fast delivery, and premium customer support.
              </p>
              
              {/* Social Media Icons (Section 6) */}
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-[10px] uppercase tracking-wider text-[#111827]">Follow Us</h4>
                <div className="flex flex-col gap-2.5 text-[11px] text-[#6B7280]">
                  <a 
                    href="https://www.instagram.com/hellobeautycollections/" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-2 group hover:text-[#2874F0] font-medium transition-colors"
                  >
                    <span className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-[#2874F0] group-hover:text-white transition-all transform group-hover:scale-105">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                        <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                      </svg>
                    </span>
                    <span>Collections & Makeover</span>
                  </a>
                  <a 
                    href="https://www.instagram.com/hellobeauty_customizejewellery/" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-2 group hover:text-[#2874F0] font-medium transition-colors"
                  >
                    <span className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-[#2874F0] group-hover:text-white transition-all transform group-hover:scale-105">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                        <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                      </svg>
                    </span>
                    <span>Customized Jewellery (Gold)</span>
                  </a>
                  <a 
                    href="https://www.facebook.com/people/Hello-Beauty/61560911925332/" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-2 group hover:text-[#2874F0] font-medium transition-colors"
                  >
                    <span className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-[#2874F0] group-hover:text-white transition-all transform group-hover:scale-105">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
                      </svg>
                    </span>
                    <span>Facebook Profile</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Column 2: Shop Categories */}
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-[#111827]">Shop Categories</h4>
              <ul className="space-y-2.5 text-[11px]">
                {[
                  { name: "Makeup", label: "Makeup" },
                  { name: "Skincare", label: "Skincare" },
                  { name: "Jewelry", label: "Jewelry" },
                  { name: "Hair Care", label: "Hair Care", query: "Hair" },
                  { name: "Perfumes", label: "Perfumes", query: "Perfume" },
                  { name: "Fashion Accessories", label: "Fashion Accessories", category: "Handbags" },
                  { name: "Luxury Collection", label: "Luxury Collection", sort: "price_high_low" },
                  { name: "New Arrivals", label: "New Arrivals", sort: "newest" }
                ].map((item) => (
                  <li key={item.label}>
                    <button
                      onClick={() => {
                        if (item.category) {
                          setSelectedCategory(item.category);
                        } else if (item.query) {
                          setSearchQuery(item.query);
                          setSelectedCategory("All");
                        } else if (item.sort) {
                          setSortBy(item.sort as any);
                          setSelectedCategory("All");
                        } else {
                          setSelectedCategory(item.name);
                        }
                        setCurrentView("browse");
                        const shopEl = document.getElementById("shop-listings");
                        if (shopEl) shopEl.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="text-[#6B7280] hover:text-[#2874F0] font-medium transition-colors"
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Customer Support */}
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-[#111827]">Customer Support</h4>
              <ul className="space-y-2 text-[11px]">
                {[
                  { label: "Help Center", act: "Help Center is offline. Please email support@hellobeauty.in" },
                  { label: "Track Order", act: "You can track your orders in your Account Dashboard." },
                  { label: "Shipping Policy", act: "We offer free delivery across India on orders above ₹499." },
                  { label: "Return & Refund", act: "Easy 15-day return policy. Refunds are processed within 3-5 days." },
                  { label: "FAQs", act: "Frequently Asked Questions: WhatsApp us for instant answers." },
                  { label: "Contact Us", act: "Support Helpline: +91 88844 33663." },
                  { label: "Privacy Policy", act: "Privacy Policy: Your data is protected by industry standard encryption." },
                  { label: "Terms & Conditions", act: "Terms and Conditions: Subject to standard consumer marketplace guidelines." }
                ].map((link) => (
                  <li key={link.label}>
                    <button
                      onClick={() => alert(link.act)}
                      className="text-[#6B7280] hover:text-[#2874F0] font-medium transition-colors"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 4: Contact Us & Addresses */}
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-[#111827]">Contact Us</h4>
              <div className="space-y-3.5 text-[11px] text-[#6B7280]">
                <p className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-[#2874F0] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <a href="mailto:support@hellobeauty.in" className="hover:text-[#2874F0] font-semibold text-gray-700">support@hellobeauty.in</a>
                </p>
                <p className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 stroke-[#2874F0] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <a href="tel:+918884433663" className="hover:text-[#2874F0] font-bold text-gray-800">+91 88844 33663</a>
                </p>
                
                <div className="pt-2.5 border-t border-[#E5E7EB]/70 space-y-3">
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#2874F0] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-[#111827] text-xs">Tirupati Branch</p>
                      <p className="font-medium text-[#4B5563] text-[10px]">Collections & Makeover</p>
                      <p className="leading-relaxed mt-0.5 text-gray-600">Padmavathi Nagar, Tirupati, Avilali, Andhra Pradesh 517502</p>
                      <a 
                        href="https://share.google/3r2QzJfQQF2ggFsGg" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-[#2874F0] hover:underline font-bold mt-1.5 inline-flex items-center gap-1 text-[10px]"
                      >
                        <span>📍</span> View Store & Give Feedback
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-1.5 pt-2.5 border-t border-gray-100">
                    <MapPin className="w-3.5 h-3.5 text-[#2874F0] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-[#111827] text-xs">Chandragiri Branch</p>
                      <p className="font-medium text-[#4B5563] text-[10px]">Hello Beauty</p>
                      <p className="leading-relaxed mt-0.5 text-gray-600">H8Q8+365, Panchayati Office Rd, pathapetha, Chandragiri, Andhra Pradesh 517101</p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E5E7EB]/70 text-[10px] space-y-1.5">
                  <p className="text-gray-500 font-medium">
                    Mon - Sat | 9:00 AM - 8:00 PM
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[9px] font-bold text-green-600 uppercase tracking-wide">Live Chat Available</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Section 7 & 8: Trust Badges & Payments */}
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            
            {/* Trust Badges (Section 7) */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-2.5 text-xs font-semibold text-gray-700">
              <span className="flex items-center gap-1.5">
                <span className="text-[#FF9F00] font-bold">✓</span> 100% Authentic Products
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-[#FF9F00] font-bold">✓</span> Secure Payments
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-[#FF9F00] font-bold">✓</span> Easy Returns
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-[#FF9F00] font-bold">✓</span> Fast Delivery
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-[#FF9F00] font-bold">✓</span> 24/7 Support
              </span>
            </div>

            {/* Payment Methods (Section 8) */}
            <div className="flex items-center gap-2">
              <div className="px-2 py-0.5 bg-white border border-gray-200 rounded font-bold text-[10px] tracking-wide text-[#1A1F71] shadow-sm flex items-center justify-center h-6 w-12 select-none">
                VISA
              </div>
              <div className="px-2 py-0.5 bg-white border border-gray-200 rounded font-bold text-[10px] tracking-wide text-gray-700 shadow-sm flex items-center justify-center h-6 w-12 select-none" style={{ gap: '2px' }}>
                <span className="rounded-full opacity-90 inline-block" style={{ width: '12px', height: '12px', backgroundColor: '#EB001B', marginRight: '-5px' }} />
                <span className="rounded-full opacity-90 inline-block" style={{ width: '12px', height: '12px', backgroundColor: '#F79E1B' }} />
              </div>
              <div className="px-2 py-0.5 bg-white border border-gray-200 rounded font-bold text-[9px] tracking-tight text-[#0F6F57] shadow-sm flex items-center justify-center h-6 w-12 select-none italic">
                UPI
              </div>
              <div className="px-2 py-0.5 bg-white border border-gray-200 rounded font-extrabold text-[9px] tracking-tight text-[#002E6E] shadow-sm flex items-center justify-center h-6 w-12 select-none">
                Paytm
              </div>
              <div className="px-2 py-0.5 bg-white border border-gray-200 rounded font-bold text-[9px] tracking-tight text-gray-600 shadow-sm flex items-center justify-center h-6 w-12 select-none">
                G Pay
              </div>
            </div>

          </div>

          {/* Section 9: Bottom Copyright */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-gray-500 font-medium">
            <p>© 2026 Hellobeauty Marketplace. All rights reserved.</p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 mr-2 border-r border-gray-200 pr-3">
                <span className={`w-1.5 h-1.5 rounded-full ${wsStatus === "connected" ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
                <span className="text-[9px] text-gray-400 font-medium">
                  Sync: <span className="font-bold text-gray-500 capitalize">{wsStatus}</span>
                </span>
              </div>
              <a href="#" className="hover:text-[#2874F0] transition-colors">Privacy Policy</a>
              <span className="text-gray-300 px-1">•</span>
              <a href="#" className="hover:text-[#2874F0] transition-colors">Terms</a>
              <span className="text-gray-300 px-1">•</span>
              <a href="#" className="hover:text-[#2874F0] transition-colors">Sitemap</a>
              <span className="text-gray-300 px-1">•</span>
              <button 
                onClick={() => {
                  setCurrentView("admin");
                  const shopEl = document.getElementById("shop-listings");
                  if (shopEl) shopEl.scrollIntoView({ behavior: "smooth" });
                }} 
                className="hover:text-[#2874F0] transition-colors font-bold"
              >
                Staff Portal
              </button>
            </div>
          </div>

        </div>
      </footer>

      {/* Toast Notification Overlay */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm pointer-events-none font-sans">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-2xl shadow-premium-toast flex items-center justify-between gap-3 text-xs font-semibold tracking-wide transition-all duration-300 animate-slide-in-right ${
              toast.type === "success"
                ? "bg-toast-success border-toast-success text-emerald-800"
                : toast.type === "warning"
                ? "bg-toast-warning border-toast-warning text-amber-850"
                : toast.type === "error"
                ? "bg-toast-error border-toast-error text-rose-800"
                : "bg-toast-info border-toast-info text-[#1259C9]"
            }`}
            style={{ minWidth: "280px" }}
          >
            <div className="flex items-center gap-2.5">
              {toast.type === "success" && <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />}
              {toast.type === "warning" && <Lock className="w-5 h-5 text-amber-500 flex-shrink-0" />}
              {toast.type === "error" && <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />}
              {toast.type === "info" && <Bell className="w-5 h-5 text-[#2874F0] flex-shrink-0" />}
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              aria-label="Close Toast"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}

export default App;
