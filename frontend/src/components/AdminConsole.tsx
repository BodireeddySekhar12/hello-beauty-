import React, { useState, useEffect, useRef } from "react";
import { 
  Plus, Edit3, Trash2, Upload, BarChart3, ListOrdered, 
  Package, Key, LogOut, Eye, MousePointerClick, Users 
} from "lucide-react";
import { api, getApiUrl } from "../services/api";

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

interface Order {
  id: number;
  customer_name: string;
  phone: string;
  address: string;
  items: any[];
  total_price: number;
  status: string;
  created_at: string;
}

export const AdminConsole: React.FC = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem("hb_admin_token"));
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  
  // Tab control
  const [activeTab, setActiveTab] = useState<"inventory" | "orders" | "analytics" | "users">("inventory");

  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Form states
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Makeup");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [brand, setBrand] = useState("");
  const [discount, setDiscount] = useState("");
  const [rating, setRating] = useState("");
  const [variationsList, setVariationsList] = useState<{ name: string; values: string }[]>([]);
  
  const handleAddVariationField = () => {
    setVariationsList([...variationsList, { name: "", values: "" }]);
  };

  const handleUpdateVariation = (index: number, field: "name" | "values", value: string) => {
    const updated = [...variationsList];
    updated[index][field] = value;
    setVariationsList(updated);
  };

  const handleRemoveVariationField = (index: number) => {
    setVariationsList(variationsList.filter((_, i) => i !== index));
  };
  
  // Drag and drop / file states
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  useEffect(() => {
    if (token) {
      fetchProducts();
      fetchOrders();
      fetchUsers();
    }
  }, [token]);

  const fetchUsers = async () => {
    try {
      if (!token) return;
      const data = await api.getAdminUsers(token);
      setUsers(data);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  const fetchProducts = async () => {
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  const fetchOrders = async () => {
    try {
      if (!token) return;
      const data = await api.getAdminOrders(token);
      setOrders(data);
    } catch (err) {
      console.error("Error fetching orders:", err);
      handleLogout();
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      const data = await api.adminLogin({ username, password });
      localStorage.setItem("hb_admin_token", data.access_token);
      setToken(data.access_token);
    } catch (err: any) {
      setLoginError(err.message || "Failed to log in.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("hb_admin_token");
    setToken(null);
  };

  // Upload file helper
  const uploadImageFile = async (file: File) => {
    if (!token) return;
    setIsUploading(true);
    try {
      const data = await api.uploadImage(token, file);
      // Add server base prefix to url
      setImageUrl(getApiUrl(data.image_url));
      setFormSuccess("Image uploaded successfully!");
    } catch (err) {
      console.error(err);
      setFormError("Failed to upload image.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadImageFile(e.target.files[0]);
    }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    // Construct variations object from the dynamic list
    const variationsObj: Record<string, string[]> = {};
    variationsList.forEach(item => {
      if (item.name.trim() && item.values.trim()) {
        const vals = item.values.split(",").map(v => v.trim()).filter(Boolean);
        if (vals.length > 0) {
          variationsObj[item.name.trim().toLowerCase()] = vals;
        }
      }
    });

    const payload = {
      name,
      category,
      price: parseFloat(price),
      stock: parseInt(stock),
      description,
      image_url: imageUrl || null,
      brand: brand || null,
      discount: discount ? parseFloat(discount) : 0.0,
      rating: rating ? parseFloat(rating) : 0.0,
      variations: Object.keys(variationsObj).length > 0 ? variationsObj : null
    };

    if (!token) return;

    try {
      if (editingId) {
        await api.updateProduct(token, editingId, payload);
        setFormSuccess("Product updated!");
      } else {
        await api.addProduct(token, payload);
        setFormSuccess("Product added!");
      }
      resetForm();
      fetchProducts();
    } catch (err: any) {
      setFormError(err.message || "An error occurred.");
    }
  };

  const handleEditInit = (product: Product) => {
    setEditingId(product.id);
    setName(product.name);
    setCategory(product.category);
    setPrice(product.price.toString());
    setStock(product.stock.toString());
    setDescription(product.description);
    setImageUrl(product.image_url || "");
    setBrand(product.brand || "");
    setDiscount(product.discount ? product.discount.toString() : "0");
    setRating(product.rating ? product.rating.toString() : "0");
    if (product.variations) {
      const list = Object.entries(product.variations).map(([k, vals]) => ({
        name: k,
        values: vals.join(", ")
      }));
      setVariationsList(list);
    } else {
      setVariationsList([]);
    }
  };

  const handleDelete = async (productId: number) => {
    if (!token) return;
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await api.deleteProduct(token, productId);
      fetchProducts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!token) return;
    if (!window.confirm("Are you sure you want to delete this customer account? This action cannot be undone.")) return;
    try {
      await api.deleteAdminUser(token, userId);
      fetchUsers();
      alert("Customer account deleted successfully.");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to delete customer account.");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setCategory("Makeup");
    setPrice("");
    setStock("");
    setDescription("");
    setImageUrl("");
    setBrand("");
    setDiscount("");
    setRating("");
    setVariationsList([]);
  };

  // Seed Helper
  const handleSeed = async () => {
    try {
      await api.seedDatabase();
      fetchProducts();
      alert("Products seeded!");
    } catch (err) {
      console.error(err);
    }
  };

  // Calculate totals for Analytics
  const totalViews = products.reduce((acc, p) => acc + p.views, 0);
  const totalClicks = products.reduce((acc, p) => acc + p.clicks, 0);
  const conversionRate = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : "0.0";
  const revenueTotal = orders.reduce((acc, o) => acc + o.total_price, 0);
  // Login View
  if (!token) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white border border-[#E8E5DF] rounded-3xl p-8 shadow-premium space-y-6 animate-fade-in-up">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-full bg-[#F3EBE0] text-[#C5A059] mb-2">
              <Key className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-serif text-charcoal">Administrative Portal</h2>
            <p className="text-sm text-gray-500">Sign in to manage inventory and view tracking analytics</p>
          </div>

          {loginError && (
            <div className="p-3.5 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-semibold">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-sm font-sans">
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-gray-400 font-bold">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Admin username"
                className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none text-sm transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-gray-400 font-bold">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none text-sm transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-[#C5A059] hover:bg-[#A8833E] text-white font-semibold rounded-full shadow-md hover:shadow-lg transition-all"
            >
              LOG IN
            </button>
          </form>
          <div className="text-center">
            <span className="text-[10px] text-gray-400">Default Credentials: admin / beauty123</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in text-charcoal">
      {/* Admin Panel Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E8E5DF] pb-5">
        <div>
          <h1 className="text-3xl font-serif text-charcoal">Console Management</h1>
          <p className="text-sm text-secondary">Control store inventory, review client receipts, and watch conversions in real-time.</p>
        </div>
        <div className="flex items-center gap-3">
          {products.length === 0 && (
            <button
              onClick={handleSeed}
              className="px-5 py-2.5 text-xs font-semibold bg-[#F3EBE0] text-[#A8833E] rounded-full hover:bg-[#C5A059]/10 transition-all"
            >
              Seed Initial Store Items
            </button>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold border border-gray-200 rounded-full hover:bg-gray-50 transition-all text-gray-700"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-1 overflow-x-auto no-scrollbar font-sans text-sm font-semibold">
        <button
          onClick={() => setActiveTab("inventory")}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-all ${
            activeTab === "inventory"
              ? "border-[#C5A059] text-[#C5A059]"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <Package className="w-4 h-4" />
          Inventory Setup
        </button>
        <button
          onClick={() => setActiveTab("orders")}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-all ${
            activeTab === "orders"
              ? "border-[#C5A059] text-[#C5A059]"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <ListOrdered className="w-4 h-4" />
          Customer Invoices ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-all ${
            activeTab === "analytics"
              ? "border-[#C5A059] text-[#C5A059]"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Store Analytics
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-all ${
            activeTab === "users"
              ? "border-[#C5A059] text-[#C5A059]"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <Users className="w-4 h-4" />
          Registered Customers ({users.length})
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "inventory" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Product form */}
          <div className="lg:col-span-1 bg-white border border-[#E8E5DF] rounded-3xl p-6 shadow-subtle space-y-6">
            <h3 className="text-xl font-serif text-charcoal flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#C5A059]" />
              {editingId ? "Modify Store Item" : "New Store Item"}
            </h3>

            {formError && (
              <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-semibold">
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="p-3 bg-green-50 text-green-700 rounded-xl text-xs font-semibold">
                {formSuccess}
              </div>
            )}

            <form onSubmit={handleProductSubmit} className="space-y-4 text-xs font-sans">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Product Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Elegant Diamond Collar"
                  className="w-full p-3 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Brand Name</label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g. Aura Premium, Kora Craft"
                  className="w-full p-3 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none bg-white transition-all"
                  >
                    <option value="Makeup">Makeup</option>
                    <option value="Dresses">Dresses</option>
                    <option value="Jewelry">Jewelry</option>
                    <option value="Handbags">Handbags</option>
                    <option value="Footwear">Footwear</option>
                    <option value="Skincare">Skincare</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. 4999.00"
                    className="w-full p-3 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Stock Count</label>
                  <input
                    type="number"
                    required
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="e.g. 15"
                    className="w-full p-3 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Image URL (Optional)</label>
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Upload below or paste URL"
                    className="w-full p-3 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Discount (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    placeholder="e.g. 10"
                    className="w-full p-3 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Rating (0 - 5)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={rating}
                    onChange={(e) => setRating(e.target.value)}
                    placeholder="e.g. 4.5"
                    className="w-full p-3 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all"
                  />
                </div>
              </div>

              {/* Media Hub drag-and-drop */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Media Upload Hub</label>
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-300 ${
                    dragActive 
                      ? "border-[#C5A059] bg-[#F3EBE0]" 
                      : "border-gray-200 hover:border-[#C5A059] bg-[#FAF9F6]"
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*"
                  />
                  <div className="flex flex-col items-center gap-1.5 text-gray-500">
                    <Upload className="w-5 h-5 text-[#C5A059] animate-bounce" />
                    <p className="text-[10px] font-medium">Drag & Drop Image or Click</p>
                    <p className="text-[9px] text-gray-400">Supports PNG, JPG, WEBP</p>
                  </div>
                </div>
                {isUploading && (
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500">
                    <div className="w-3.5 h-3.5 border border-[#C5A059] border-t-transparent rounded-full animate-spin" />
                    <span>Uploading media...</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Product Variations</label>
                  <button
                    type="button"
                    onClick={handleAddVariationField}
                    className="px-2.5 py-1 text-[10px] font-bold bg-[#F3EBE0] text-[#A8833E] rounded-lg hover:bg-[#C5A059]/20 transition-all flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Option
                  </button>
                </div>
                
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                  {variationsList.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center bg-[#FAF9F6] p-2 rounded-xl border border-gray-150">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleUpdateVariation(idx, "name", e.target.value)}
                        placeholder="Name (e.g. size)"
                        className="w-1/3 p-2 border border-gray-200 rounded-lg text-xs bg-white focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none"
                      />
                      <input
                        type="text"
                        value={item.values}
                        onChange={(e) => handleUpdateVariation(idx, "values", e.target.value)}
                        placeholder="Values (e.g. S, M, L)"
                        className="flex-1 p-2 border border-gray-200 rounded-lg text-xs bg-white focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveVariationField(idx)}
                        className="p-1.5 text-gray-450 hover:text-red-650 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {variationsList.length === 0 && (
                    <p className="text-[10px] text-gray-400 italic">No variations added. (Optional)</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#C5A059] hover:bg-[#A8833E] text-white font-semibold rounded-xl shadow transition-all"
                >
                  {editingId ? "SAVE PRODUCT" : "CREATE PRODUCT"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 font-semibold text-gray-600 transition-all"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Product grid list */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-serif text-charcoal">All Store Products ({products.length})</h3>
              <span className="text-xs text-gray-500">Updates live when consumers interact</span>
            </div>
            
            <div className="bg-white border border-[#E8E5DF] rounded-3xl overflow-hidden shadow-subtle">
              <table className="w-full text-left border-collapse text-xs font-sans">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase tracking-wider font-bold">
                    <th className="p-4">Item</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Price</th>
                    <th className="p-4">Stock</th>
                    <th className="p-4 text-center">Analytics</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0">
                          <img 
                            src={product.image_url || "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=60"} 
                            alt={product.name} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{product.name}</p>
                          <p className="text-[10px] text-gray-400 line-clamp-1 max-w-[200px]">{product.description}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 font-medium">
                          {product.category}
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-gray-900">₹{product.price.toLocaleString("en-IN")}</td>
                      <td className="p-4">
                        <span className={`font-semibold ${product.stock === 0 ? "text-red-500" : "text-gray-900"}`}>
                          {product.stock}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center items-center gap-3 text-gray-400 text-[10px]">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5 text-gray-300" />
                            {product.views}
                          </span>
                          <span className="flex items-center gap-1">
                            <MousePointerClick className="w-3.5 h-3.5 text-gray-300" />
                            {product.clicks}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => handleEditInit(product)}
                            className="p-2 text-gray-500 hover:text-[#C5A059] rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="p-2 text-gray-500 hover:text-red-600 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center p-8 text-gray-400 font-medium">
                        No products in inventory. Use the form or seed button.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "orders" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-serif text-charcoal">Recent WhatsApp Checkouts</h3>
            <span className="text-xs text-gray-500">Totals: {orders.length} orders | Value: ₹{revenueTotal.toLocaleString("en-IN")}</span>
          </div>

          <div className="bg-white border border-[#E8E5DF] rounded-3xl overflow-hidden shadow-subtle">
            <div className="divide-y divide-gray-150 font-sans text-xs">
              {orders.map((order) => (
                <div key={order.id} className="p-6 hover:bg-gray-50/50 transition-colors grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">#HB-{order.id.toString().padStart(5, "0")}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-100">
                        {order.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400">{new Date(order.created_at).toLocaleString()}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="font-bold text-gray-800">{order.customer_name}</p>
                    <p className="text-gray-500">{order.phone}</p>
                    <p className="text-gray-400 text-[10px] line-clamp-2">{order.address}</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Purchased Items</p>
                    <div className="space-y-1">
                      {order.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-gray-600">
                          <span>
                            {item.name} <span className="text-gray-400 font-medium">x{item.quantity}</span>
                            {item.chosen_variation && (
                              <span className="text-[9px] text-[#A8833E] ml-1 bg-[#F3EBE0] px-1.5 py-0.5 rounded-full">
                                {Object.entries(item.chosen_variation).map(([k, v]) => `${k}:${v}`).join(", ")}
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-right space-y-1 md:self-center">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Order Value</p>
                    <p className="text-lg font-bold text-[#C5A059]">₹{order.total_price.toLocaleString("en-IN")}</p>
                  </div>
                </div>
              ))}
              {orders.length === 0 && (
                <div className="text-center p-12 text-gray-400 font-medium">
                  No orders have been routed via WhatsApp yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "analytics" && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 font-sans">
            <div className="bg-white border border-[#E8E5DF] rounded-2xl p-5 shadow-subtle space-y-2">
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Aggregated Views</span>
              <p className="text-2xl font-bold text-gray-800">{totalViews}</p>
            </div>
            <div className="bg-white border border-[#E8E5DF] rounded-2xl p-5 shadow-subtle space-y-2">
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Aggregated Clicks</span>
              <p className="text-2xl font-bold text-gray-800">{totalClicks}</p>
            </div>
            <div className="bg-white border border-[#E8E5DF] rounded-2xl p-5 shadow-subtle space-y-2">
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Conversion Rate</span>
              <p className="text-2xl font-bold text-[#C5A059]">{conversionRate}%</p>
            </div>
            <div className="bg-white border border-[#E8E5DF] rounded-2xl p-5 shadow-subtle space-y-2">
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Generated Revenue</span>
              <p className="text-2xl font-bold text-emerald-700">₹{revenueTotal.toLocaleString("en-IN")}</p>
            </div>
          </div>

          {/* Interactive Chart */}
          <div className="bg-white border border-[#E8E5DF] rounded-3xl p-6 shadow-subtle space-y-4">
            <div>
              <h3 className="text-xl font-serif text-charcoal">Conversion Performance</h3>
              <p className="text-xs text-gray-400 font-sans">Tracking view-to-click response on each item listing</p>
            </div>

            {/* Custom SVG Bar Chart */}
            {products.length > 0 ? (
              <div className="w-full font-sans text-xs pt-4 overflow-x-auto no-scrollbar">
                <div className="min-w-[500px] h-72 flex items-end justify-around pb-6 border-b border-gray-150 relative">
                  {/* Left Axis */}
                  <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[9px] text-gray-400 pr-2 pointer-events-none">
                    <span>Max</span>
                    <span>Mid</span>
                    <span>0</span>
                  </div>

                  {products.map((product) => {
                    const maxVal = Math.max(...products.map(p => Math.max(p.views, p.clicks, 1)));
                    const viewsHeight = `${(product.views / maxVal) * 85}%`;
                    const clicksHeight = `${(product.clicks / maxVal) * 85}%`;
                    return (
                      <div key={product.id} className="flex flex-col items-center gap-2 w-16 relative group">
                        <div className="h-48 w-full flex items-end justify-center gap-1.5 relative">
                          {/* Views bar (Gold/Champagne) */}
                          <div 
                            style={{ height: viewsHeight }}
                            className="w-4 bg-[#F3EBE0] group-hover:bg-[#C5A059]/30 rounded-t-sm transition-all duration-500 relative flex justify-center"
                          >
                            <div className="absolute -top-6 bg-gray-800 text-white text-[9px] px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                              Views: {product.views}
                            </div>
                          </div>
                          {/* Clicks bar (Velvet Burgundy) */}
                          <div 
                            style={{ height: clicksHeight }}
                            className="w-4 bg-[#5C1D24] group-hover:bg-[#5C1D24]/85 rounded-t-sm transition-all duration-500 relative flex justify-center"
                          >
                            <div className="absolute -top-6 bg-gray-800 text-white text-[9px] px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                              Clicks: {product.clicks}
                            </div>
                          </div>
                        </div>
                        
                        {/* Label */}
                        <span className="text-[10px] text-gray-500 text-center truncate w-full font-medium" title={product.name}>
                          {product.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {/* Legend */}
                <div className="flex items-center gap-6 justify-center pt-4 text-xs font-semibold text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded bg-[#F3EBE0] border border-gray-200" />
                    <span>Product Views</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded bg-[#5C1D24]" />
                    <span>Product Clicks</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center p-12 text-gray-400 font-medium">
                No inventory items available to visualize.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "users" && (
        <div className="bg-white border border-[#E8E5DF] rounded-3xl p-6 shadow-subtle space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-serif text-charcoal flex items-center gap-2">
              <Users className="w-5 h-5 text-[#C5A059]" />
              Registered Customer Accounts
            </h3>
            <button
              onClick={fetchUsers}
              className="px-4 py-2 text-xs font-semibold border border-gray-200 rounded-full hover:bg-gray-50 transition-all text-gray-700 font-sans"
            >
              Refresh List
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans text-xs">
            <div className="p-4 border border-[#E8E5DF] rounded-2xl bg-gray-50">
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Total Registrations</span>
              <p className="text-2xl font-bold text-gray-800 mt-1">{users.length}</p>
            </div>
            <div className="p-4 border border-[#E8E5DF] rounded-2xl bg-gray-50">
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Fully Verified & Active</span>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{users.filter(u => u.is_active).length}</p>
            </div>
            <div className="p-4 border border-[#E8E5DF] rounded-2xl bg-gray-50">
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Pending Verification</span>
              <p className="text-2xl font-bold text-amber-600 mt-1">{users.filter(u => !u.is_active).length}</p>
            </div>
          </div>

          {users.length > 0 ? (
            <div className="overflow-x-auto border border-gray-100 rounded-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase tracking-wider font-bold">
                    <th className="p-4">Customer Name</th>
                    <th className="p-4">Mobile Number</th>
                    <th className="p-4">Email Address</th>
                    <th className="p-4">Verification Badges</th>
                    <th className="p-4">Account Status</th>
                    <th className="p-4">Registration Date</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-sans">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors font-medium">
                      <td className="p-4 font-bold text-gray-800">{user.name || "N/A"}</td>
                      <td className="p-4 text-gray-700">{user.phone}</td>
                      <td className="p-4 text-gray-600">{user.email}</td>
                      <td className="p-4 space-x-2">
                        {user.email_verified ? (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded text-[9px] font-bold">
                            Email Verified
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded text-[9px] font-bold">
                            Email Pending
                          </span>
                        )}
                        {user.phone_verified ? (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded text-[9px] font-bold">
                            Phone Verified
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded text-[9px] font-bold">
                            Phone Pending
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        {user.is_active ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[9px] font-bold">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-[9px] font-bold">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-gray-500">
                        {new Date(user.created_at).toLocaleString()}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-full transition-colors"
                          title="Delete Customer Account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center p-12 text-gray-400 font-medium">
              No customer records found.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default AdminConsole;
