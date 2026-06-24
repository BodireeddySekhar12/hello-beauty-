import React, { useState, useEffect } from "react";
import { Heart, ClipboardList, User, ArrowRight, MapPin, Lock, Edit3, Trash2, Plus, Check } from "lucide-react";
import { api } from "../services/api";

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

interface Address {
  id: number;
  user_id: number;
  customer_name: string;
  phone: string;
  address_line: string;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
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

interface DashboardProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  favorites: number[];
  onToggleFavorite: (id: number) => void;
  customerToken: string | null;
  customerData: any;
  onLogin: (token: string, userData: any) => void;
  onLogout: () => void;
  onUpdateWishlist: (wishlist: number[]) => void;
  onAddToCart: (product: Product, quantity: number, variations: Record<string, string>) => void;
  initialTab?: "profile" | "addresses" | "wishlist" | "orders";
}

export const Dashboard: React.FC<DashboardProps> = ({
  products,
  onSelectProduct,
  favorites,
  onToggleFavorite,
  customerToken,
  customerData,
  onLogin,
  onLogout,
  onUpdateWishlist,
  onAddToCart,
  initialTab,
}) => {
  // Navigation & View Tabs
  const [activeTab, setActiveTab] = useState<"profile" | "addresses" | "wishlist" | "orders">(initialTab || "profile");
  const [authTab, setAuthTab] = useState<"login" | "register" | "forgot" | "verify">("login");

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  
  // Login State Forms
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Register State Forms
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regError, setRegError] = useState("");
  const [regSuccess, setRegSuccess] = useState("");

  // Forgot Password State Forms
  const [forgotPhone, setForgotPhone] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");

  // Verification State Forms
  const [verifyEmail, setVerifyEmail] = useState("");
  const [verifyPhone, setVerifyPhone] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [emailVerifiedState, setEmailVerifiedState] = useState(false);
  const [phoneVerifiedState, setPhoneVerifiedState] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [verifySuccess, setVerifySuccess] = useState("");
  const [emailResendCooldown, setEmailResendCooldown] = useState(0);
  const [phoneResendCooldown, setPhoneResendCooldown] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setEmailResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      setPhoneResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Profile Management State
  const [profileName, setProfileName] = useState(customerData?.name || "");
  const [profilePhone, setProfilePhone] = useState(customerData?.phone || "");
  const [profileEmail, setProfileEmail] = useState(customerData?.email || "");
  const [profilePic, setProfilePic] = useState(customerData?.profile_picture || "");
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  // Password Change State
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // Address Book State
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  
  // Address Form State
  const [addrName, setAddrName] = useState("");
  const [addrPhone, setAddrPhone] = useState("");
  const [addrLine, setAddrLine] = useState("");
  const [addrCity, setAddrCity] = useState("");
  const [addrState, setAddrState] = useState("");
  const [addrPincode, setAddrPincode] = useState("");
  const [addrDefault, setAddrDefault] = useState(false);
  const [addrError, setAddrError] = useState("");

  // Orders State
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  // Sync profile inputs when customer data loads
  useEffect(() => {
    if (customerData) {
      setProfileName(customerData.name || "");
      setProfilePhone(customerData.phone || "");
      setProfileEmail(customerData.email || "");
      setProfilePic(customerData.profile_picture || "");
    }
  }, [customerData]);

  // Load addresses and orders when token is present
  useEffect(() => {
    if (customerToken && customerData?.id) {
      loadAddresses();
      loadOrders();
    }
  }, [customerToken, customerData]);

  const loadAddresses = async () => {
    if (!customerToken || !customerData?.id) return;
    try {
      const data = await api.getAddresses(customerToken, customerData.id);
      setAddresses(data);
    } catch (err) {
      console.error("Failed to load addresses:", err);
    }
  };

  const loadOrders = async () => {
    if (!customerToken) return;
    try {
      const data = await api.getCustomerOrders(customerToken);
      setMyOrders(data);
    } catch (err) {
      console.error("Failed to load orders:", err);
    }
  };

  // Auth Submissions
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      const data = await api.customerLogin({ username: loginUsername, password: loginPassword });
      onLogin(data.access_token, data.user);
      onUpdateWishlist(data.user.wishlist || []);
      setLoginUsername("");
      setLoginPassword("");
    } catch (err: any) {
      if (err.status === 403 && err.verificationContext) {
        const ctx = err.verificationContext;
        setVerifyEmail(ctx.email || "");
        setVerifyPhone(ctx.phone || "");
        setEmailVerifiedState(ctx.email_verified || false);
        setPhoneVerifiedState(ctx.phone_verified || false);
        setVerifyError("Your account is unverified. Please complete verification.");
        setVerifySuccess("");
        setAuthTab("verify");
      } else {
        setLoginError(err.message || "Failed to log in");
      }
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    setRegSuccess("");
    try {
      await api.customerRegister({
        name: regName,
        phone: regPhone,
        email: regEmail,
        password: regPassword
      });
      setVerifySuccess("");
      setVerifyError("");
      setLoginError("");
      setRegSuccess("Registration completed successfully! You can now sign in.");
      setLoginUsername(regPhone);
      setAuthTab("login");
      
      // Clear inputs
      setRegName("");
      setRegPhone("");
      setRegEmail("");
      setRegPassword("");
    } catch (err: any) {
      setRegError(err.message || "Registration failed");
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError("");
    setVerifySuccess("");
    try {
      const res = await api.customerVerifyEmail(verifyEmail, emailOtp);
      setEmailVerifiedState(true);
      setEmailOtp("");
      if (res.is_active) {
        setVerifySuccess("Email and Phone verified! Account is now active. You can now log in.");
        setTimeout(() => {
          setAuthTab("login");
          setLoginUsername(verifyPhone);
        }, 3000);
      } else {
        setVerifySuccess("Email verified successfully! Please verify your phone number as well.");
      }
    } catch (err: any) {
      setVerifyError(err.message || "Email verification failed");
    }
  };

  const handleVerifyPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError("");
    setVerifySuccess("");
    try {
      const res = await api.customerVerifyPhone(verifyPhone, phoneOtp);
      setPhoneVerifiedState(true);
      setPhoneOtp("");
      setVerifySuccess("Phone number verified! Account is now active. You can now log in.");
      setTimeout(() => {
        setAuthTab("login");
        setLoginUsername(verifyPhone);
      }, 3000);
    } catch (err: any) {
      setVerifyError(err.message || "Phone verification failed");
    }
  };

  const handleResendEmail = async () => {
    if (emailResendCooldown > 0) return;
    setVerifyError("");
    setVerifySuccess("");
    try {
      await api.customerResendEmailOtp(verifyEmail);
      setVerifySuccess("Verification email code resent successfully!");
      setEmailResendCooldown(60);
    } catch (err: any) {
      setVerifyError(err.message || "Failed to resend code");
    }
  };

  const handleResendPhone = async () => {
    if (phoneResendCooldown > 0) return;
    setVerifyError("");
    setVerifySuccess("");
    try {
      const res = await api.customerResendPhoneOtp(verifyPhone);
      if (res && res.mock_otp) {
        setVerifySuccess(`Verification SMS code resent successfully! [MOCK OTP: ${res.mock_otp}]`);
      } else {
        setVerifySuccess("Verification SMS code resent successfully!");
      }
      setPhoneResendCooldown(60);
    } catch (err: any) {
      setVerifyError(err.message || "Failed to resend code");
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");
    try {
      await api.customerResetPassword({
        phone: forgotPhone,
        email: forgotEmail,
        new_password: forgotNewPassword
      });
      setForgotSuccess("Password reset successfully! Log in with your new password.");
      setAuthTab("login");
      setLoginUsername(forgotPhone);
      
      setForgotPhone("");
      setForgotEmail("");
      setForgotNewPassword("");
    } catch (err: any) {
      setForgotError(err.message || "Password reset failed");
    }
  };

  // Profile Submissions
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");
    if (!customerToken) return;
    try {
      const updatedUser = await api.customerUpdateProfile(customerToken, {
        name: profileName,
        phone: profilePhone,
        email: profileEmail,
        profile_picture: profilePic
      });
      onLogin(customerToken, updatedUser); // Update context
      setProfileSuccess("Profile updated successfully!");
    } catch (err: any) {
      setProfileError(err.message || "Failed to update profile");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");
    if (!customerToken) return;
    try {
      await api.customerChangePassword(customerToken, {
        old_password: oldPassword,
        new_password: newPassword
      });
      setPasswordSuccess("Password changed successfully!");
      setOldPassword("");
      setNewPassword("");
    } catch (err: any) {
      setPasswordError(err.message || "Failed to change password");
    }
  };

  // Address Submissions
  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddrError("");
    if (!customerToken || !customerData?.id) return;
    
    const payload = {
      user_id: customerData.id,
      customer_name: addrName,
      phone: addrPhone,
      address_line: addrLine,
      city: addrCity,
      state: addrState,
      pincode: addrPincode,
      is_default: addrDefault
    };

    try {
      if (editingAddressId) {
        await api.updateAddress(customerToken, editingAddressId, payload);
      } else {
        await api.createAddress(customerToken, payload);
      }
      setIsAddingAddress(false);
      setEditingAddressId(null);
      clearAddressForm();
      loadAddresses();
    } catch (err: any) {
      setAddrError(err.message || "Failed to save address");
    }
  };

  const handleEditAddressClick = (addr: Address) => {
    setEditingAddressId(addr.id);
    setAddrName(addr.customer_name);
    setAddrPhone(addr.phone);
    setAddrLine(addr.address_line);
    setAddrCity(addr.city);
    setAddrState(addr.state);
    setAddrPincode(addr.pincode);
    setAddrDefault(addr.is_default);
    setIsAddingAddress(true);
  };

  const handleDeleteAddress = async (addrId: number) => {
    if (!customerToken) return;
    if (confirm("Are you sure you want to delete this address?")) {
      try {
        await api.deleteAddress(customerToken, addrId);
        loadAddresses();
      } catch (err) {
        console.error("Failed to delete address:", err);
      }
    }
  };

  const clearAddressForm = () => {
    setAddrName("");
    setAddrPhone("");
    setAddrLine("");
    setAddrCity("");
    setAddrState("");
    setAddrPincode("");
    setAddrDefault(false);
  };

  // Stepper Configs
  const trackingSteps = [
    { key: "Pending", label: "Placed", desc: "Recorded successfully" },
    { key: "Confirmed", label: "Confirmed", desc: "Seller accepted" },
    { key: "Shipped", label: "Shipped", desc: "On the way" },
    { key: "Delivered", label: "Delivered", desc: "Completed" }
  ];

  const getActiveStepIndex = (status: string) => {
    const s = status.toLowerCase();
    if (s === "pending") return 0;
    if (s === "confirmed") return 1;
    if (s === "shipped") return 2;
    if (s === "delivered") return 3;
    return -1; // Cancelled
  };

  // Filter products by favorites list
  const favoriteProducts = products.filter(p => favorites.includes(p.id));

  // Logged-out Layout
  if (!customerToken) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-white border border-[#E8E5DF] rounded-3xl p-8 shadow-premium space-y-6">
          <div className="text-center space-y-2 border-b border-gray-100 pb-4">
            <div className="inline-flex p-3 rounded-full bg-[#F3EBE0] text-[#C5A059] mb-1">
              <User className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-serif text-charcoal">Customer Dashboard</h2>
            <div className="flex justify-center gap-4 text-xs font-semibold">
              <button 
                onClick={() => { setAuthTab("login"); setLoginError(""); setRegSuccess(""); setForgotSuccess(""); }}
                className={`pb-1 ${authTab === "login" ? "text-[#C5A059] border-b-2 border-[#C5A059]" : "text-gray-400"}`}
              >
                Sign In
              </button>
              <button 
                onClick={() => { setAuthTab("register"); setRegError(""); setRegSuccess(""); setForgotSuccess(""); }}
                className={`pb-1 ${authTab === "register" ? "text-[#C5A059] border-b-2 border-[#C5A059]" : "text-gray-400"}`}
              >
                Register
              </button>
              <button 
                onClick={() => { setAuthTab("forgot"); setForgotError(""); setRegSuccess(""); setForgotSuccess(""); }}
                className={`pb-1 ${authTab === "forgot" ? "text-[#C5A059] border-b-2 border-[#C5A059]" : "text-gray-400"}`}
              >
                Forgot Password
              </button>
            </div>
          </div>

          {/* Messages */}
          {loginError && <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-semibold">{loginError}</div>}
          {regError && <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-semibold">{regError}</div>}
          {forgotError && <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-semibold">{forgotError}</div>}
          {verifyError && <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-semibold">{verifyError}</div>}
          {regSuccess && <div className="p-3 bg-emerald-50 text-[#0F8A5F] border border-emerald-100 rounded-xl text-xs font-semibold">{regSuccess}</div>}
          {forgotSuccess && <div className="p-3 bg-emerald-50 text-[#0F8A5F] border border-emerald-100 rounded-xl text-xs font-semibold">{forgotSuccess}</div>}
          {verifySuccess && <div className="p-3 bg-emerald-50 text-[#0F8A5F] border border-emerald-100 rounded-xl text-xs font-semibold">{verifySuccess}</div>}

          {/* Render Active Form */}
          {authTab === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs font-sans">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Email or Phone Number</label>
                <input
                  type="text"
                  required
                  placeholder="Enter email or mobile number"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-[#C5A059] hover:bg-[#A8833E] text-white font-semibold rounded-full shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <span>SIGN IN</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {authTab === "register" && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs font-sans">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Enter your full name"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Mobile Number</label>
                <input
                  type="tel"
                  required
                  placeholder="Enter 10-digit number"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="Enter email address"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Password</label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-[#C5A059] hover:bg-[#A8833E] text-white font-semibold rounded-full shadow-md hover:shadow-lg transition-all"
              >
                CREATE ACCOUNT
              </button>
            </form>
          )}

          {authTab === "forgot" && (
            <form onSubmit={handleForgotSubmit} className="space-y-4 text-xs font-sans">
              <p className="text-[11px] text-gray-400 leading-normal">Enter your registered phone and email to reset your password.</p>
              
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Mobile Number</label>
                <input
                  type="text"
                  required
                  placeholder="Enter 10-digit number"
                  value={forgotPhone}
                  onChange={(e) => setForgotPhone(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="Enter email address"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={forgotNewPassword}
                  onChange={(e) => setForgotNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-[#C5A059] hover:bg-[#A8833E] text-white font-semibold rounded-full shadow-md hover:shadow-lg transition-all"
              >
                RESET PASSWORD
              </button>
            </form>
          )}

          {authTab === "verify" && (
            <div className="space-y-6 text-xs font-sans">
              <p className="text-[11px] text-gray-500 leading-normal">
                To activate your account, please verify your phone number.
              </p>

              {/* Phone Verification Box */}
              <div className="p-4 border border-[#E8E5DF] rounded-2xl bg-gray-50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-700">Phone Verification</span>
                  {phoneVerifiedState ? (
                    <span className="px-2 py-0.5 bg-emerald-50 text-[#0F8A5F] border border-emerald-100 rounded-md text-[10px] font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> VERIFIED
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-md text-[10px] font-bold">
                      PENDING
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-400">{verifyPhone}</p>
                {!phoneVerifiedState && (
                  <form onSubmit={handleVerifyPhone} className="flex gap-2">
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="6-digit OTP"
                      value={phoneOtp}
                      onChange={(e) => setPhoneOtp(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none text-xs"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#C5A059] hover:bg-[#A8833E] text-white font-semibold rounded-lg transition-all"
                    >
                      Verify
                    </button>
                  </form>
                )}
                {!phoneVerifiedState && (
                  <button
                    onClick={handleResendPhone}
                    disabled={phoneResendCooldown > 0}
                    className={`text-[10px] font-semibold transition-all ${
                      phoneResendCooldown > 0 ? "text-gray-400 cursor-not-allowed" : "text-[#C5A059] hover:text-[#A8833E] underline"
                    }`}
                  >
                    {phoneResendCooldown > 0 ? `Resend code in ${phoneResendCooldown}s` : "Resend SMS verification code"}
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setAuthTab("login");
                  setLoginError("");
                  setVerifySuccess("");
                  setVerifyError("");
                }}
                className="w-full text-center text-xs font-semibold text-gray-500 hover:text-gray-700 underline"
              >
                Back to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Logged-in Layout
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-fade-in font-sans text-xs">
      
      {/* Sidebar Navigation */}
      <div className="lg:col-span-1 space-y-6">
        {/* User Card */}
        <div className="bg-white border border-[#E8E5DF] rounded-3xl p-5 shadow-subtle space-y-3.5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-[#F3EBE0] text-[#C5A059] flex items-center justify-center border border-gray-150">
              {profilePic ? (
                <img src={profilePic} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-6 h-6" />
              )}
            </div>
            <div className="truncate">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Hello,</p>
              <h3 className="font-bold text-gray-800 text-sm truncate">{customerData?.name || "Customer"}</h3>
            </div>
          </div>
        </div>

        {/* Navigation Tab Links */}
        <div className="bg-white border border-[#E8E5DF] rounded-3xl overflow-hidden shadow-subtle font-semibold text-gray-600">
          <button
            onClick={() => setActiveTab("profile")}
            className={`w-full py-3.5 px-6 border-b border-gray-50 flex items-center gap-3 hover:bg-gray-50 transition-all text-left ${
              activeTab === "profile" ? "bg-[#F3EBE0]/50 text-[#C5A059] border-l-4 border-l-[#C5A059]" : ""
            }`}
          >
            <User className="w-4 h-4" />
            <span>Personal Information</span>
          </button>
          
          <button
            onClick={() => setActiveTab("addresses")}
            className={`w-full py-3.5 px-6 border-b border-gray-50 flex items-center gap-3 hover:bg-gray-50 transition-all text-left ${
              activeTab === "addresses" ? "bg-[#F3EBE0]/50 text-[#C5A059] border-l-4 border-l-[#C5A059]" : ""
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Manage Addresses</span>
          </button>

          <button
            onClick={() => setActiveTab("wishlist")}
            className={`w-full py-3.5 px-6 border-b border-gray-50 flex items-center gap-3 hover:bg-gray-50 transition-all text-left ${
              activeTab === "wishlist" ? "bg-[#F3EBE0]/50 text-[#C5A059] border-l-4 border-l-[#C5A059]" : ""
            }`}
          >
            <Heart className="w-4 h-4 text-[#5C1D24]" />
            <span>My Wishlist</span>
          </button>

          <button
            onClick={() => setActiveTab("orders")}
            className={`w-full py-3.5 px-6 border-b border-gray-50 flex items-center gap-3 hover:bg-gray-50 transition-all text-left ${
              activeTab === "orders" ? "bg-[#F3EBE0]/50 text-[#C5A059] border-l-4 border-l-[#C5A059]" : ""
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>My Orders</span>
          </button>

          <button
            onClick={onLogout}
            className="w-full py-3.5 px-6 text-[#5C1D24] flex items-center gap-3 hover:bg-red-50 transition-all text-left"
          >
            <Lock className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="lg:col-span-3 space-y-6">
        
        {/* Tab 1: Profile management */}
        {activeTab === "profile" && (
          <div className="space-y-6">
            <div className="bg-white border border-[#E8E5DF] rounded-3xl p-6 shadow-subtle space-y-6">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <User className="w-5 h-5 text-[#C5A059]" />
                <h3 className="text-base font-serif text-charcoal">Edit Profile Information</h3>
              </div>

              {profileError && <div className="p-3 bg-red-50 text-red-600 rounded-xl font-medium">{profileError}</div>}
              {profileSuccess && <div className="p-3 bg-emerald-50 text-[#0F8A5F] rounded-xl font-medium">{profileSuccess}</div>}

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold tracking-wider uppercase text-[9px]">Full Name</label>
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#C5A059] outline-none text-xs bg-gray-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold tracking-wider uppercase text-[9px]">Profile Image URL</label>
                    <input
                      type="text"
                      value={profilePic}
                      onChange={(e) => setProfilePic(e.target.value)}
                      placeholder="e.g. https://link-to-photo.jpg"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#C5A059] outline-none text-xs bg-gray-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold tracking-wider uppercase text-[9px]">Mobile Number</label>
                    <input
                      type="text"
                      required
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#C5A059] outline-none text-xs bg-gray-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold tracking-wider uppercase text-[9px]">Email Address</label>
                    <input
                      type="email"
                      required
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#C5A059] outline-none text-xs bg-gray-50"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-6 py-3 bg-[#C5A059] hover:bg-[#A8833E] text-white font-semibold rounded-full shadow-sm hover:shadow-md transition-all"
                >
                  SAVE PROFILE CHANGES
                </button>
              </form>
            </div>

            {/* Change Password Pane */}
            <div className="bg-white border border-[#E8E5DF] rounded-3xl p-6 shadow-subtle space-y-6">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <Lock className="w-5 h-5 text-[#5C1D24]" />
                <h3 className="text-base font-serif text-charcoal">Security & Password</h3>
              </div>

              {passwordError && <div className="p-3 bg-red-50 text-red-600 rounded-xl font-medium">{passwordError}</div>}
              {passwordSuccess && <div className="p-3 bg-emerald-50 text-[#0F8A5F] rounded-xl font-medium">{passwordSuccess}</div>}

              <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                <div className="space-y-1">
                  <label className="text-gray-400 font-bold tracking-wider uppercase text-[9px]">Current Password</label>
                  <input
                    type="password"
                    required
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#C5A059] outline-none text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-400 font-bold tracking-wider uppercase text-[9px]">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#C5A059] outline-none text-xs"
                  />
                </div>

                <button
                  type="submit"
                  className="px-6 py-3 bg-[#1C1A17] hover:bg-black text-white font-semibold rounded-full shadow-sm hover:shadow-md transition-all"
                >
                  UPDATE PASSWORD
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Tab 2: Addresses Management */}
        {activeTab === "addresses" && (
          <div className="bg-white border border-[#E8E5DF] rounded-3xl p-6 shadow-subtle space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#C5A059]" />
                <h3 className="text-base font-serif text-charcoal">Delivery Address Book</h3>
              </div>
              {!isAddingAddress && (
                <button
                  onClick={() => { clearAddressForm(); setEditingAddressId(null); setIsAddingAddress(true); }}
                  className="px-4 py-2 bg-[#C5A059] hover:bg-[#A8833E] text-white font-semibold rounded-full flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ADD NEW ADDRESS</span>
                </button>
              )}
            </div>

            {isAddingAddress && (
              <div className="bg-gray-50 border border-[#E8E5DF] rounded-2xl p-5 space-y-4">
                <h4 className="font-semibold text-charcoal">{editingAddressId ? "Modify Shipping Address" : "New Shipping Address"}</h4>
                {addrError && <div className="p-3 bg-red-50 text-red-600 rounded-lg">{addrError}</div>}
                
                <form onSubmit={handleAddressSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-gray-400 font-bold uppercase text-[9px]">Recipient Name</label>
                      <input
                        type="text"
                        required
                        value={addrName}
                        onChange={(e) => setAddrName(e.target.value)}
                        placeholder="e.g. Jane Doe"
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#C5A059] outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-gray-400 font-bold uppercase text-[9px]">Contact Phone</label>
                      <input
                        type="text"
                        required
                        value={addrPhone}
                        onChange={(e) => setAddrPhone(e.target.value)}
                        placeholder="10-digit number"
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#C5A059] outline-none"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-gray-400 font-bold uppercase text-[9px]">Address Details</label>
                      <input
                        type="text"
                        required
                        value={addrLine}
                        onChange={(e) => setAddrLine(e.target.value)}
                        placeholder="Flat/House no, building name, street address"
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#C5A059] outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-gray-400 font-bold uppercase text-[9px]">City</label>
                      <input
                        type="text"
                        required
                        value={addrCity}
                        onChange={(e) => setAddrCity(e.target.value)}
                        placeholder="e.g. Bangalore"
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#C5A059] outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-gray-400 font-bold uppercase text-[9px]">State</label>
                      <input
                        type="text"
                        required
                        value={addrState}
                        onChange={(e) => setAddrState(e.target.value)}
                        placeholder="e.g. Karnataka"
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#C5A059] outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-gray-400 font-bold uppercase text-[9px]">Pincode</label>
                      <input
                        type="text"
                        required
                        value={addrPincode}
                        onChange={(e) => setAddrPincode(e.target.value)}
                        placeholder="6-digit pincode"
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#C5A059] outline-none"
                      />
                    </div>
                    
                    <div className="flex items-center gap-2 md:col-span-2 pt-2">
                      <input
                        type="checkbox"
                        id="default_addr"
                        checked={addrDefault}
                        onChange={(e) => setAddrDefault(e.target.checked)}
                        className="rounded text-[#C5A059] focus:ring-[#C5A059]"
                        style={{ accentColor: "#C5A059" }}
                      />
                      <label htmlFor="default_addr" className="font-semibold text-charcoal cursor-pointer">Set as default shipping address</label>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-[#C5A059] hover:bg-[#A8833E] text-white font-semibold rounded-full transition-all"
                    >
                      {editingAddressId ? "UPDATE ADDRESS" : "SAVE ADDRESS"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsAddingAddress(false); setEditingAddressId(null); clearAddressForm(); }}
                      className="px-5 py-2.5 border border-gray-200 text-gray-500 font-semibold rounded-full hover:bg-gray-100 transition-all"
                    >
                      CANCEL
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="space-y-4">
              {addresses.map((addr) => (
                <div 
                  key={addr.id}
                  className={`border rounded-2xl p-5 flex items-start justify-between gap-4 transition-all ${
                    addr.is_default ? "border-[#C5A059] bg-[#F3EBE0]/10" : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-800 text-sm">{addr.customer_name}</span>
                      {addr.is_default && (
                        <span className="px-2 py-0.5 rounded-full bg-[#F3EBE0] text-[#A8833E] border border-[#C5A059]/20 font-bold text-[9px]">
                          DEFAULT
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 font-medium leading-relaxed">
                      {addr.address_line}, {addr.city}, {addr.state} - <span className="font-bold">{addr.pincode}</span>
                    </p>
                    <p className="text-gray-400 font-semibold">Phone: +91 {addr.phone}</p>
                  </div>

                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleEditAddressClick(addr)}
                      className="p-2 border border-gray-150 rounded-lg hover:bg-gray-50 hover:text-[#C5A059] text-gray-400 transition-all"
                      title="Edit Address"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteAddress(addr.id)}
                      className="p-2 border border-gray-150 rounded-lg hover:bg-red-50 hover:text-[#5C1D24] text-gray-400 transition-all"
                      title="Delete Address"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {addresses.length === 0 && !isAddingAddress && (
                <div className="text-center py-10 border border-dashed border-gray-200 rounded-2xl text-gray-400 space-y-2">
                  <MapPin className="w-8 h-8 text-gray-300 mx-auto" />
                  <p className="font-medium">Address book is empty</p>
                  <p className="text-xs text-gray-400">Add shipping coordinates to checkout quicker next time.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Wishlist */}
        {activeTab === "wishlist" && (
          <div className="bg-white border border-[#E8E5DF] rounded-3xl p-6 shadow-subtle space-y-6">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <Heart className="w-5 h-5 text-[#5C1D24] fill-[#5C1D24]" />
              <h3 className="text-base font-serif text-charcoal">My Saved Wishlist ({favoriteProducts.length})</h3>
            </div>

            <div className="space-y-4">
              {favoriteProducts.map((prod) => (
                <div 
                  key={prod.id}
                  className="border border-gray-100 rounded-2xl p-4 flex items-center justify-between gap-4 hover:border-gray-200 transition-all bg-white group"
                >
                  <div className="flex items-center gap-4">
                    <div 
                      onClick={() => onSelectProduct(prod)}
                      className="w-14 h-14 bg-gray-50 rounded-xl overflow-hidden border border-gray-100 flex-shrink-0 cursor-pointer"
                    >
                      <img 
                        src={prod.image_url || "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=80"}
                        alt={prod.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[8px] uppercase tracking-widest text-[#C5A059] font-bold">{prod.category}</span>
                      <h4 
                        onClick={() => onSelectProduct(prod)}
                        className="font-bold text-gray-900 text-sm cursor-pointer hover:text-[#C5A059] transition-colors"
                      >
                        {prod.name}
                      </h4>
                      <p className="font-bold text-gray-700">₹{prod.price.toLocaleString("en-IN")}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const defaultOptions: Record<string, string> = {};
                        if (prod.variations) {
                          Object.entries(prod.variations).forEach(([k, vals]) => {
                            if (vals && vals.length > 0) defaultOptions[k] = vals[0];
                          });
                        }
                        onAddToCart(prod, 1, defaultOptions);
                        alert("Item added to your cart!");
                      }}
                      className="px-4 py-2 bg-[#1C1A17] hover:bg-black text-white font-semibold rounded-full shadow-sm transition-all"
                    >
                      ADD TO CART
                    </button>
                    <button
                      onClick={() => onToggleFavorite(prod.id)}
                      className="p-2 border border-gray-150 rounded-full hover:bg-red-50 text-gray-300 hover:text-[#5C1D24] transition-all"
                      title="Remove from Wishlist"
                    >
                      <Heart className="w-4 h-4 fill-current" />
                    </button>
                  </div>
                </div>
              ))}

              {favoriteProducts.length === 0 && (
                <div className="text-center py-10 border border-dashed border-gray-200 rounded-2xl text-gray-400 space-y-2">
                  <Heart className="w-8 h-8 text-gray-300 mx-auto" />
                  <p className="font-medium">Wishlist is empty</p>
                  <p className="text-xs text-gray-400">Click the heart icon on cards when browsing to bookmark items.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Order History & Stepper Tracking */}
        {activeTab === "orders" && (
          <div className="bg-white border border-[#E8E5DF] rounded-3xl p-6 shadow-subtle space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-[#C5A059]" />
                <h3 className="text-base font-serif text-charcoal">My Orders ({myOrders.length})</h3>
              </div>
              <button 
                onClick={loadOrders}
                className="text-xs text-[#C5A059] font-bold hover:underline"
              >
                Refresh List
              </button>
            </div>

            <div className="space-y-4">
              {myOrders.map((ord) => {
                const isExpanded = expandedOrderId === ord.id;
                const activeIndex = getActiveStepIndex(ord.status);
                const isCancelled = ord.status.toLowerCase() === "cancelled";

                return (
                  <div 
                    key={ord.id}
                    className="border border-gray-150 rounded-2xl overflow-hidden shadow-subtle transition-all bg-white"
                  >
                    {/* Collapsed Header Summary */}
                    <div 
                      onClick={() => setExpandedOrderId(isExpanded ? null : ord.id)}
                      className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#F3EBE0]/30 rounded-xl flex items-center justify-center text-[#C5A059] border border-gray-100 flex-shrink-0">
                          <ClipboardList className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-gray-900 text-sm">Order #HB-{ord.id.toString().padStart(5, "0")}</span>
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] border ${
                              isCancelled 
                                ? "bg-red-50 text-[#5C1D24] border-red-100"
                                : ord.status === "Delivered"
                                ? "bg-emerald-50 text-[#0F8A5F] border-emerald-100"
                                : "bg-orange-50 text-orange-700 border-orange-100"
                            }`}>
                              {ord.status}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-0.5">{new Date(ord.created_at).toLocaleDateString()} at {new Date(ord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 justify-between sm:justify-end">
                        <div className="text-right">
                          <p className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Total Paid</p>
                          <p className="font-bold text-gray-900 text-sm">₹{ord.total_price.toLocaleString("en-IN")}</p>
                        </div>
                        <span className="text-[#C5A059] font-bold text-[10px] hover:underline">
                          {isExpanded ? "Collapse Details" : "Track Order"}
                        </span>
                      </div>
                    </div>

                    {/* Expanded Stepper & Details */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 bg-gray-50/40 p-5 space-y-6 animate-fade-in">
                        {/* Stepper Tracking Visual */}
                        {!isCancelled ? (
                          <div className="space-y-4">
                            <h4 className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Delivery Status Tracking</h4>
                            
                            {/* Visual Timeline Bar */}
                            <div className="flex items-center justify-between relative py-2">
                              {/* Background Connecting Line */}
                              <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-gray-200 z-0" />
                              {/* Foreground Active Line */}
                              <div 
                                className="absolute left-6 top-1/2 -translate-y-1/2 h-0.5 bg-[#C5A059] z-0 transition-all duration-500" 
                                style={{ width: `${activeIndex >= 0 ? (activeIndex / (trackingSteps.length - 1)) * 100 : 0}%` }}
                              />

                              {trackingSteps.map((step, sIdx) => {
                                const isDone = sIdx <= activeIndex;
                                const isCurrent = sIdx === activeIndex;

                                return (
                                  <div key={step.key} className="flex flex-col items-center text-center space-y-1.5 z-10 relative">
                                    <div 
                                      className={`w-6.5 h-6.5 rounded-full flex items-center justify-center border-2 transition-all ${
                                        isCurrent
                                          ? "bg-[#C5A059] border-[#C5A059] text-white shadow-md scale-110"
                                          : isDone
                                          ? "bg-[#C5A059] border-[#C5A059] text-white"
                                          : "bg-white border-gray-200 text-gray-400"
                                      }`}
                                    >
                                      {isDone && sIdx < activeIndex ? (
                                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                                      ) : (
                                        <span className="text-[10px] font-bold">{sIdx + 1}</span>
                                      )}
                                    </div>
                                    <div className="space-y-0.5 max-w-[80px]">
                                      <p className={`font-bold text-[10px] ${isDone ? "text-charcoal" : "text-gray-400"}`}>{step.label}</p>
                                      <p className="text-[8px] text-gray-400 leading-none">{step.desc}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 flex items-center gap-3">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#5C1D24] animate-pulse" />
                            <div>
                              <p className="font-bold text-xs text-[#5C1D24]">This order was cancelled</p>
                              <p className="text-[10px] text-gray-500">Refund has been processed or contact help if this was done in error.</p>
                            </div>
                          </div>
                        )}

                        {/* Order Items Table */}
                        <div className="space-y-2.5">
                          <h4 className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Items Ordered</h4>
                          <div className="space-y-2">
                            {ord.items.map((item: any, itemIdx: number) => {
                              const matchProd = products.find(p => p.id === item.product_id);
                              const img = matchProd?.image_url || "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=60";

                              return (
                                <div key={itemIdx} className="bg-white border border-gray-150 rounded-xl p-3 flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-100 flex-shrink-0">
                                      <img src={img} alt={item.name} className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                      <h5 className="font-bold text-gray-800">{item.name}</h5>
                                      <p className="text-gray-400 text-[10px]">
                                        ₹{item.price.toLocaleString("en-IN")} x {item.quantity}
                                        {item.chosen_variation && Object.keys(item.chosen_variation).length > 0 && (
                                          <span className="text-[#A8833E] ml-2">
                                            ({Object.entries(item.chosen_variation).map(([k, v]) => `${k}: ${v}`).join(", ")})
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                  <span className="font-bold text-gray-900">₹{(item.price * item.quantity).toLocaleString("en-IN")}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Shipping Coordinate Summary */}
                        <div className="bg-white border border-gray-150 rounded-xl p-4 space-y-1.5">
                          <h4 className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Shipment Delivery Address</h4>
                          <p className="font-bold text-gray-800">{ord.customer_name}</p>
                          <p className="text-gray-600 font-medium">{ord.address}</p>
                          <p className="text-gray-400 font-semibold">Contact: +91 {ord.phone}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {myOrders.length === 0 && (
                <div className="text-center py-12 border border-dashed border-gray-200 rounded-2xl text-gray-400">
                  <ClipboardList className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="font-semibold">No orders placed yet</p>
                  <p className="text-xs text-gray-400 mt-1">Items added to your cart and completed during checkout will show here.</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
export default Dashboard;
