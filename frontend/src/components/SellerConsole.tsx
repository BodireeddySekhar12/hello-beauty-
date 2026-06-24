import React, { useState, useEffect, useRef } from "react";
import { 
  Plus, Edit3, Trash2, Upload, BarChart3, ClipboardList, 
  Package, Key, LogOut, Eye, MousePointerClick, Activity 
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

interface InventoryLog {
  id: number;
  product_id: number;
  change_amount: number;
  reason: string;
  created_at: string;
}

export const SellerConsole: React.FC = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem("hb_seller_token"));
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  
  // Tab control
  const [activeTab, setActiveTab] = useState<"inventory" | "logs" | "analytics" | "orders">("inventory");

  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  // Form states
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Chains");
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
      fetchLogs();
      fetchOrders();
    }
  }, [token]);

  const fetchProducts = async () => {
    try {
      if (!token) return;
      const data = await api.getSellerProducts(token);
      setProducts(data);
    } catch (err) {
      console.error("Error fetching seller products:", err);
      handleLogout();
    }
  };

  const fetchLogs = async () => {
    try {
      if (!token) return;
      const data = await api.getSellerInventoryLogs(token);
      setLogs(data);
    } catch (err) {
      console.error("Error fetching seller logs:", err);
    }
  };

  const fetchOrders = async () => {
    try {
      if (!token) return;
      const data = await api.getSellerOrders(token);
      setOrders(data);
    } catch (err) {
      console.error("Error fetching orders:", err);
    }
  };

  const handleUpdateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      if (!token) return;
      await api.updateOrderStatus(token, orderId, newStatus);
      fetchOrders();
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Failed to update order status");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      const data = await api.adminLogin({ username, password });
      if (data.role !== "SELLER") {
        setLoginError("Not authorized as seller. Please use seller credentials.");
        return;
      }
      localStorage.setItem("hb_seller_token", data.access_token);
      setToken(data.access_token);
    } catch (err: any) {
      setLoginError(err.message || "Failed to log in.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("hb_seller_token");
    setToken(null);
  };

  // Upload file helper
  const uploadImageFile = async (file: File) => {
    if (!token) return;
    setIsUploading(true);
    setFormError("");
    setFormSuccess("");
    try {
      const data = await api.uploadSellerImage(token, file);
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
        await api.updateSellerProduct(token, editingId, payload);
        setFormSuccess("Product updated successfully!");
      } else {
        await api.addSellerProduct(token, payload);
        setFormSuccess("Product added successfully!");
      }
      resetForm();
      fetchProducts();
      fetchLogs();
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
      await api.deleteSellerProduct(token, productId);
      fetchProducts();
      fetchLogs();
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setCategory("Chains");
    setPrice("");
    setStock("");
    setDescription("");
    setImageUrl("");
    setBrand("");
    setDiscount("");
    setRating("");
    setVariationsList([]);
  };

  // Calculate totals for Analytics
  const totalViews = products.reduce((acc, p) => acc + p.views, 0);
  const totalClicks = products.reduce((acc, p) => acc + p.clicks, 0);
  const conversionRate = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : "0.0";

  // Login View
  if (!token) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white border border-[#E8E5DF] rounded-3xl p-8 shadow-premium space-y-6 animate-fade-in-up">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-full bg-[#F3EBE0] text-[#C5A059] mb-2">
              <Key className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-serif text-charcoal">Seller Portal</h2>
            <p className="text-sm text-gray-500">Sign in to manage your inventory and view real-time stock logs</p>
          </div>

          {loginError && (
            <div className="p-3.5 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-semibold">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-sm font-sans">
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-gray-400 font-bold">Username / Phone</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Seller username or phone"
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
              LOG IN AS SELLER
            </button>
          </form>
          <div className="text-center">
            <span className="text-[10px] text-gray-400">Default Credentials: seller / seller123</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in text-charcoal">
      {/* Seller Panel Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E8E5DF] pb-5">
        <div>
          <h1 className="text-3xl font-serif text-charcoal">Seller Portal</h1>
          <p className="text-sm text-secondary">Manage your unique items, monitor stock levels, and review inventory history.</p>
        </div>
        <div className="flex items-center gap-3">
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
          My Products
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-all ${
            activeTab === "logs"
              ? "border-[#C5A059] text-[#C5A059]"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          Stock Activity Logs ({logs.length})
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
          My Analytics
        </button>
        <button
          onClick={() => setActiveTab("orders")}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-all ${
            activeTab === "orders"
              ? "border-[#C5A059] text-[#C5A059]"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          Customer Orders ({orders.length})
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "inventory" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Product form */}
          <div className="lg:col-span-1 bg-white border border-[#E8E5DF] rounded-3xl p-6 shadow-subtle space-y-6">
            <h3 className="text-xl font-serif text-charcoal flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#C5A059]" />
              {editingId ? "Modify Product" : "New Seller Product"}
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
                  placeholder="e.g. Handmade Velvet Kurti"
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
                    <option value="Chains">Chains</option>
                    <option value="Apparel">Apparel</option>
                    <option value="Makeup">Makeup</option>
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
                    placeholder="e.g. 2999.00"
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
                    placeholder="e.g. 10"
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
                <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Upload Image</label>
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 min-h-[90px] ${
                    dragActive 
                      ? "border-[#C5A059] bg-[#C5A059]/5" 
                      : "border-gray-200 hover:border-gray-300 bg-gray-50/50"
                  }`}
                >
                  <Upload className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-semibold text-gray-600 text-[10px]">
                      {isUploading ? "Uploading file..." : "Drag image here or click to browse"}
                    </p>
                    <p className="text-[9px] text-gray-400 mt-0.5">Supports PNG, JPG, JPEG</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Variations details */}
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
                    <div key={idx} className="flex gap-2 items-center bg-gray-50 p-2 rounded-xl border border-gray-100">
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
                  className="flex-grow py-3 bg-[#C5A059] hover:bg-[#A8833E] text-white font-semibold rounded-full shadow-sm hover:shadow-md transition-all text-center"
                >
                  {editingId ? "UPDATE PRODUCT" : "ADD PRODUCT"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-5 py-3 border border-gray-200 text-gray-600 rounded-full hover:bg-gray-50 transition-all font-semibold"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Product grid list */}
          <div className="lg:col-span-2 bg-white border border-[#E8E5DF] rounded-3xl p-6 shadow-subtle space-y-4">
            <h3 className="text-xl font-serif text-charcoal">My Products ({products.length})</h3>

            <div className="overflow-x-auto border border-gray-100 rounded-2xl">
              <table className="w-full border-collapse text-left font-sans text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold uppercase tracking-wider text-[9px]">
                    <th className="p-4">Item</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Price</th>
                    <th className="p-4">Stock</th>
                    <th className="p-4">Stats</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map((prod) => (
                    <tr key={prod.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 overflow-hidden border border-gray-200/50 flex-shrink-0">
                          {prod.image_url ? (
                            <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400 bg-gray-50 font-bold uppercase">hb</div>
                          )}
                        </div>
                        <div className="font-semibold text-gray-800 text-xs truncate max-w-[120px]">{prod.name}</div>
                      </td>
                      <td className="p-4 text-gray-500 font-medium">{prod.category}</td>
                      <td className="p-4 text-gray-800 font-bold">₹{prod.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                          prod.stock === 0 
                            ? "bg-red-50 text-red-600" 
                            : prod.stock < 5 
                              ? "bg-amber-50 text-amber-600" 
                              : "bg-green-50 text-green-600"
                        }`}>
                          {prod.stock} left
                        </span>
                      </td>
                      <td className="p-4 text-[10px] text-gray-400 font-medium">
                        <span className="inline-flex items-center gap-1 mr-3"><Eye className="w-3.5 h-3.5" /> {prod.views}</span>
                        <span className="inline-flex items-center gap-1"><MousePointerClick className="w-3.5 h-3.5" /> {prod.clicks}</span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleEditInit(prod)}
                            className="p-2 text-gray-400 hover:text-[#C5A059] hover:bg-[#F3EBE0]/30 rounded-lg transition-all"
                            title="Edit Product"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(prod.id)}
                            className="p-2 text-gray-400 hover:text-[#5C1D24] hover:bg-red-50 rounded-lg transition-all"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-400 font-medium">
                        No products added yet. Use the form on the left to add your first product.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "logs" && (
        <div className="bg-white border border-[#E8E5DF] rounded-3xl p-6 shadow-subtle space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-xl font-serif text-charcoal flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#C5A059]" />
                Stock Activity History
              </h3>
              <p className="text-xs text-gray-400 mt-1">Audit log of all stock increases and checkout deductions.</p>
            </div>
          </div>

          <div className="overflow-x-auto border border-gray-100 rounded-2xl">
            <table className="w-full border-collapse text-left font-sans text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold uppercase tracking-wider text-[9px]">
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Product ID / Name</th>
                  <th className="p-4">Adjustment</th>
                  <th className="p-4">Audit Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => {
                  const relatedProduct = products.find(p => p.id === log.product_id);
                  return (
                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 text-gray-400 font-medium">
                        {new Date(log.created_at).toLocaleString("en-IN")}
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-gray-800">
                          {relatedProduct ? relatedProduct.name : `Product ID: ${log.product_id}`}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center font-bold px-2 py-0.5 rounded text-[10px] ${
                          log.change_amount > 0 
                            ? "bg-green-50 text-green-700" 
                            : "bg-red-50 text-red-700"
                        }`}>
                          {log.change_amount > 0 ? `+${log.change_amount}` : log.change_amount}
                        </span>
                      </td>
                      <td className="p-4 text-gray-600 font-medium">{log.reason}</td>
                    </tr>
                  );
                })}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-400 font-medium">
                      No stock adjustments logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "analytics" && (
        <div className="space-y-6">
          {/* Metrics grids */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
            <div className="bg-white border border-[#E8E5DF] rounded-3xl p-6 shadow-subtle flex items-center gap-4">
              <div className="p-3 bg-[#F3EBE0] text-[#C5A059] rounded-2xl">
                <Eye className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Total Impressions</p>
                <p className="text-2xl font-serif font-bold text-gray-800 mt-1">{totalViews}</p>
              </div>
            </div>

            <div className="bg-white border border-[#E8E5DF] rounded-3xl p-6 shadow-subtle flex items-center gap-4">
              <div className="p-3 bg-[#F3EBE0] text-[#C5A059] rounded-2xl">
                <MousePointerClick className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Product Clicks</p>
                <p className="text-2xl font-serif font-bold text-gray-800 mt-1">{totalClicks}</p>
              </div>
            </div>

            <div className="bg-white border border-[#E8E5DF] rounded-3xl p-6 shadow-subtle flex items-center gap-4">
              <div className="p-3 bg-red-50 text-[#5C1D24] rounded-2xl">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Click-Through-Rate</p>
                <p className="text-2xl font-serif font-bold text-gray-800 mt-1">{conversionRate}%</p>
              </div>
            </div>
          </div>

          {/* Top Products performance list */}
          <div className="bg-white border border-[#E8E5DF] rounded-3xl p-6 shadow-subtle space-y-4">
            <h3 className="text-xl font-serif text-charcoal">Product Interest Score</h3>
            <div className="space-y-3.5">
              {products
                .sort((a, b) => (b.views + b.clicks) - (a.views + a.clicks))
                .slice(0, 5)
                .map((prod, idx) => {
                  const score = prod.views + prod.clicks * 3; // custom weighted score
                  return (
                    <div key={prod.id} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100 text-xs">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#F3EBE0] text-[#A8833E] flex items-center justify-center font-bold text-[10px]">
                          #{idx + 1}
                        </span>
                        <div className="font-semibold text-gray-800 truncate max-w-[180px]">{prod.name}</div>
                      </div>
                      <div className="flex items-center gap-6 text-[10px] text-gray-500 font-medium">
                        <span>{prod.views} views</span>
                        <span>{prod.clicks} clicks</span>
                        <span className="font-bold text-[#A8833E]">Interest Score: {score}</span>
                      </div>
                    </div>
                  );
                })}
              {products.length === 0 && (
                <div className="p-8 text-center text-gray-400 font-medium">
                  No products available to measure interest scores.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "orders" && (
        <div className="bg-white border border-[#E8E5DF] rounded-3xl p-6 shadow-subtle space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="text-xl font-serif text-charcoal">Customer Order Tracking</h3>
            <button 
              onClick={fetchOrders}
              className="text-xs text-[#C5A059] font-bold hover:underline"
            >
              Refresh Orders
            </button>
          </div>

          <div className="space-y-4">
            {orders.map((ord) => (
              <div 
                key={ord.id}
                className="border border-gray-200 rounded-2xl p-5 bg-white space-y-4 text-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-50 pb-3">
                  <div>
                    <span className="font-bold text-gray-900 text-sm">Order #HB-{ord.id.toString().padStart(5, "0")}</span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">Placed on: {new Date(ord.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] text-gray-400 font-bold uppercase">Update Status:</label>
                    <select
                      value={ord.status}
                      onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value)}
                      className="p-1.5 border border-gray-200 rounded-lg bg-white text-xs font-semibold focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Shipped">Shipped</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Items</h4>
                    <div className="space-y-1">
                      {ord.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between border-b border-gray-50 pb-1">
                          <span>{item.name} <span className="text-gray-400">(x{item.quantity})</span></span>
                          <span className="font-semibold text-gray-900">₹{(item.price * item.quantity).toLocaleString("en-IN")}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between font-bold text-charcoal pt-1.5">
                      <span>Total Price Paid:</span>
                      <span>₹{ord.total_price.toLocaleString("en-IN")}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                    <h4 className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Customer & Delivery Details</h4>
                    <p className="font-semibold text-gray-800">Name: {ord.customer_name}</p>
                    <p className="font-semibold text-gray-800">Phone: +91 {ord.phone}</p>
                    <p className="text-gray-600 font-medium">Address: {ord.address}</p>
                  </div>
                </div>
              </div>
            ))}

            {orders.length === 0 && (
              <div className="text-center py-10 border border-dashed border-gray-200 rounded-2xl text-gray-400">
                <ClipboardList className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="font-medium">No order placements found in database</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
