export const getApiUrl = (path: string): string => {
  const protocol = window.location.protocol;
  let hostname = window.location.hostname;
  if (hostname === "localhost") {
    hostname = "127.0.0.1";
  }
  const host = (window.location.port && window.location.port !== "8000")
    ? `${hostname}:8000`
    : window.location.host;
  return `${protocol}//${host}${path}`;
};

export const api = {
  // Public Products
  async getProducts() {
    const res = await fetch(getApiUrl("/api/products"));
    if (!res.ok) throw new Error("Failed to fetch products");
    return res.json();
  },

  async getProduct(productId: number) {
    const res = await fetch(getApiUrl(`/api/products/${productId}`));
    if (!res.ok) throw new Error("Failed to fetch product details");
    return res.json();
  },

  async registerClick(productId: number) {
    const res = await fetch(getApiUrl(`/api/products/${productId}/click`), {
      method: "POST"
    });
    if (!res.ok) throw new Error("Failed to register click");
    return res.json();
  },

  // Orders
  async createOrder(orderData: any, token?: string) {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const res = await fetch(getApiUrl("/api/orders"), {
      method: "POST",
      headers: headers,
      body: JSON.stringify(orderData)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Failed to place order");
    }
    return res.json();
  },

  // Admin Auth
  async adminLogin(loginData: any) {
    const res = await fetch(getApiUrl("/api/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(loginData)
    });
    if (!res.ok) throw new Error("Incorrect credentials");
    return res.json();
  },

  // Admin Operations
  async getAdminOrders(token: string) {
    const res = await fetch(getApiUrl("/api/admin/orders"), {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch admin orders");
    return res.json();
  },

  async getAdminUsers(token: string) {
    const res = await fetch(getApiUrl("/api/admin/users"), {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch registered customers");
    return res.json();
  },

  async deleteAdminUser(token: string, userId: number) {
    const res = await fetch(getApiUrl(`/api/admin/users/${userId}`), {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to delete customer account");
    }
    return res.json();
  },

  async addProduct(token: string, productData: any) {
    const res = await fetch(getApiUrl("/api/admin/products"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(productData)
    });
    if (!res.ok) throw new Error("Failed to add product");
    return res.json();
  },

  async updateProduct(token: string, productId: number, productData: any) {
    const res = await fetch(getApiUrl(`/api/admin/products/${productId}`), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(productData)
    });
    if (!res.ok) throw new Error("Failed to update product");
    return res.json();
  },

  async deleteProduct(token: string, productId: number) {
    const res = await fetch(getApiUrl(`/api/admin/products/${productId}`), {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to delete product");
    return res.json();
  },

  async seedDatabase() {
    const res = await fetch(getApiUrl("/api/admin/seed"), {
      method: "POST"
    });
    if (!res.ok) throw new Error("Failed to seed database");
    return res.json();
  },

  async uploadImage(token: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(getApiUrl("/api/admin/upload"), {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` },
      body: formData
    });
    if (!res.ok) throw new Error("Failed to upload image");
    return res.json();
  },

  // Seller Operations
  async getSellerProducts(token: string) {
    const res = await fetch(getApiUrl("/api/seller/products"), {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch seller products");
    return res.json();
  },

  async addSellerProduct(token: string, productData: any) {
    const res = await fetch(getApiUrl("/api/seller/products"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(productData)
    });
    if (!res.ok) throw new Error("Failed to add seller product");
    return res.json();
  },

  async updateSellerProduct(token: string, productId: number, productData: any) {
    const res = await fetch(getApiUrl(`/api/seller/products/${productId}`), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(productData)
    });
    if (!res.ok) throw new Error("Failed to update seller product");
    return res.json();
  },

  async deleteSellerProduct(token: string, productId: number) {
    const res = await fetch(getApiUrl(`/api/seller/products/${productId}`), {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to delete seller product");
    return res.json();
  },

  async getSellerInventoryLogs(token: string) {
    const res = await fetch(getApiUrl("/api/seller/inventory-logs"), {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch seller inventory logs");
    return res.json();
  },

  async uploadSellerImage(token: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(getApiUrl("/api/seller/upload"), {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` },
      body: formData
    });
    if (!res.ok) throw new Error("Failed to upload seller image");
    return res.json();
  },

  // Customer Authentication & Profiles
  async customerRegister(regData: any) {
    const res = await fetch(getApiUrl("/api/customer/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(regData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Registration failed");
    }
    return res.json();
  },

  async customerLogin(loginData: any) {
    const res = await fetch(getApiUrl("/api/customer/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(loginData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (res.status === 403) {
        const error = new Error(err.detail?.message || "Account is unverified");
        (error as any).status = 403;
        (error as any).verificationContext = err.detail;
        throw error;
      }
      throw new Error(typeof err.detail === 'string' ? err.detail : (err.detail?.message || "Incorrect username or password"));
    }
    return res.json();
  },

  async customerGetProfile(token: string) {
    const res = await fetch(getApiUrl("/api/customer/profile"), {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch profile");
    return res.json();
  },

  async customerUpdateProfile(token: string, data: any) {
    const res = await fetch(getApiUrl("/api/customer/profile"), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to update profile");
    }
    return res.json();
  },

  async customerChangePassword(token: string, data: any) {
    const res = await fetch(getApiUrl("/api/customer/change-password"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to change password");
    }
    return res.json();
  },

  async customerResetPassword(data: any) {
    const res = await fetch(getApiUrl("/api/customer/reset-password"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to reset password");
    }
    return res.json();
  },

  async customerUpdateWishlist(token: string, productIds: number[]) {
    const res = await fetch(getApiUrl("/api/customer/wishlist"), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(productIds)
    });
    if (!res.ok) throw new Error("Failed to update wishlist");
    return res.json();
  },

  async getCustomerOrders(token: string) {
    const res = await fetch(getApiUrl("/api/customer/orders"), {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch customer orders");
    return res.json();
  },

  // Delivery Addresses
  async getAddresses(token: string, userId: number) {
    const res = await fetch(getApiUrl(`/api/users/${userId}/addresses`), {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch addresses");
    return res.json();
  },

  async createAddress(token: string, addressData: any) {
    const res = await fetch(getApiUrl("/api/addresses"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(addressData)
    });
    if (!res.ok) throw new Error("Failed to create address");
    return res.json();
  },

  async updateAddress(token: string, addressId: number, addressData: any) {
    const res = await fetch(getApiUrl(`/api/addresses/${addressId}`), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(addressData)
    });
    if (!res.ok) throw new Error("Failed to update address");
    return res.json();
  },

  async deleteAddress(token: string, addressId: number) {
    const res = await fetch(getApiUrl(`/api/addresses/${addressId}`), {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to delete address");
    return res.json();
  },

  // Seller Order Management
  async getSellerOrders(token: string) {
    const res = await fetch(getApiUrl("/api/seller/orders"), {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch seller orders");
    return res.json();
  },

  async updateOrderStatus(token: string, orderId: number, status: string) {
    const res = await fetch(getApiUrl(`/api/seller/orders/${orderId}/status`), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error("Failed to update order status");
    return res.json();
  },

  async customerVerifyEmail(email: string, otp: string) {
    const res = await fetch(getApiUrl("/api/customer/verify/email"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to verify email");
    }
    return res.json();
  },

  async customerVerifyPhone(phone: string, otp: string) {
    const res = await fetch(getApiUrl("/api/customer/verify/phone"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, otp })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to verify phone number");
    }
    return res.json();
  },

  async customerResendEmailOtp(email: string) {
    const res = await fetch(getApiUrl("/api/customer/resend/email"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to resend email verification code");
    }
    return res.json();
  },

  async customerResendPhoneOtp(phone: string) {
    const res = await fetch(getApiUrl("/api/customer/resend/phone"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to resend SMS verification code");
    }
    return res.json();
  }
};
