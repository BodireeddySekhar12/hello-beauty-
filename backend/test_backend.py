import os
import sys
import unittest

# Force SQLite temporary DB for testing before importing anything
os.environ["DATABASE_URL"] = "sqlite:///./test_hellobeauty.db"

# Ensure backend directory is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from main import app
from utils.whatsapp import assemble_whatsapp_receipt, get_whatsapp_url
from database import init_db
from models import DBProduct


class TestHelloBeautyBackend(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        # Clean up database file if it exists from a crashed run
        if os.path.exists("test_hellobeauty.db"):
            try:
                os.remove("test_hellobeauty.db")
            except Exception:
                pass
        # Force SQLite in-memory or temporary DB for testing
        os.environ["DATABASE_URL"] = "sqlite:///./test_hellobeauty.db"
        init_db()
        cls.client = TestClient(app)
        
    @classmethod
    def tearDownClass(cls):
        # Clean up database file after tests
        if os.path.exists("test_hellobeauty.db"):
            try:
                os.remove("test_hellobeauty.db")
            except Exception:
                pass

    def test_whatsapp_receipt_assembly(self):
        # Test receipt text builder
        order_id = 42
        customer = "Jane Test"
        phone = "9199998888"
        address = "123 Test Apt, India"
        items = [
            {
                "product_id": 1,
                "name": "Gold Chain",
                "quantity": 2,
                "price": 5000.0,
                "chosen_variation": {"length": "18 inch"}
            }
        ]
        total = 10000.0
        
        receipt = assemble_whatsapp_receipt(order_id, customer, phone, address, items, total)
        
        # Assertions
        self.assertIn("HELLOBEAUTY", receipt)
        self.assertIn("#HB-00042", receipt)
        self.assertIn("Jane Test", receipt)
        self.assertIn("Gold Chain", receipt)
        self.assertIn("length: 18 inch", receipt)
        self.assertIn("₹10,000.00", receipt)
        
        # Test URL builder
        url = get_whatsapp_url(receipt)
        self.assertTrue(url.startswith("https://wa.me/"))
        self.assertIn("918884433663", url)

    def test_get_products_empty(self):
        response = self.client.get("/api/products")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json(), list)

    def test_add_product_unauthorized(self):
        payload = {
            "name": "Test Product",
            "description": "Premium quality testing",
            "category": "Chains",
            "price": 1200.0,
            "stock": 5,
            "image_url": "http://test.com/img.png",
            "variations": {"size": ["M"]}
        }
        response = self.client.post("/api/admin/products", json=payload)
        # Should block with 401 unauthorized because no auth header was provided
        self.assertEqual(response.status_code, 401)

    def test_product_seeding_and_read(self):
        # Seed database via seeding route
        response = self.client.post("/api/admin/seed")
        self.assertEqual(response.status_code, 200)
        self.assertIn("seeded", response.json()["status"])
        
        # Get products and check if seeded items are present
        get_res = self.client.get("/api/products")
        self.assertEqual(get_res.status_code, 200)
        products = get_res.json()
        self.assertGreater(len(products), 0)
        
        # Verify first item detail & view counter increment
        first_product_id = products[0]["id"]
        detail_res = self.client.get(f"/api/products/{first_product_id}")
        self.assertEqual(detail_res.status_code, 200)
        # Counter should be incremented (since database view tracking counts it)
        self.assertGreater(detail_res.json()["views"], 0)

    def test_seller_flow(self):
        # 1. Seed database to ensure seller exists
        seed_res = self.client.post("/api/admin/seed")
        self.assertEqual(seed_res.status_code, 200)

        # 2. Login as seller
        login_payload = {"username": "seller", "password": "seller123"}
        login_res = self.client.post("/api/auth/login", json=login_payload)
        self.assertEqual(login_res.status_code, 200)
        login_data = login_res.json()
        self.assertIn("access_token", login_data)
        self.assertEqual(login_data["role"], "SELLER")
        token = login_data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 3. Add a new seller product
        product_payload = {
            "name": "Seller Velvet Silk Kurti",
            "description": "Bespoke handcrafted velvet kurti in deep crimson silk.",
            "category": "Apparel",
            "price": 6500.0,
            "stock": 10,
            "image_url": None,
            "brand": "Kora Craft",
            "discount": 5.0,
            "rating": 4.5,
            "variations": {"sizes": ["M", "L"]}
        }
        add_res = self.client.post("/api/seller/products", json=product_payload, headers=headers)
        self.assertEqual(add_res.status_code, 200)
        product_data = add_res.json()
        self.assertEqual(product_data["name"], "Seller Velvet Silk Kurti")
        self.assertEqual(product_data["brand"], "Kora Craft")
        self.assertEqual(product_data["discount"], 5.0)
        self.assertEqual(product_data["rating"], 4.5)
        self.assertEqual(product_data["stock"], 10)
        product_id = product_data["id"]

        # 4. Get seller products and verify it contains our product
        get_res = self.client.get("/api/seller/products", headers=headers)
        self.assertEqual(get_res.status_code, 200)
        seller_products = get_res.json()
        self.assertTrue(any(p["id"] == product_id for p in seller_products))

        # 5. Update product stock (adjusting stock from 10 to 15)
        update_payload = {"stock": 15}
        update_res = self.client.put(f"/api/seller/products/{product_id}", json=update_payload, headers=headers)
        self.assertEqual(update_res.status_code, 200)
        self.assertEqual(update_res.json()["stock"], 15)

        # 6. Retrieve inventory logs and verify stock adjustment of +5 was logged
        logs_res = self.client.get("/api/seller/inventory-logs", headers=headers)
        self.assertEqual(logs_res.status_code, 200)
        logs = logs_res.json()
        self.assertGreater(len(logs), 0)
        
        # Check that there is a log with product_id and change_amount = 5
        adjust_log = next((l for l in logs if l["product_id"] == product_id and l["change_amount"] == 5), None)
        self.assertIsNotNone(adjust_log)

    def test_customer_module_flow(self):
        # 1. Register a new customer
        register_payload = {
            "name": "Beauty Lover",
            "phone": "9876543210",
            "email": "beauty@lover.com",
            "password": "secretpassword"
        }
        reg_res = self.client.post("/api/customer/register", json=register_payload)
        self.assertEqual(reg_res.status_code, 200)
        self.assertEqual(reg_res.json()["status"], "success")

        # Attempting duplicate register should fail
        dup_res = self.client.post("/api/customer/register", json=register_payload)
        self.assertEqual(dup_res.status_code, 400)

        # 2. Login customer
        login_payload = {
            "username": "beauty@lover.com",
            "password": "secretpassword"
        }
        login_res = self.client.post("/api/customer/login", json=login_payload)
        self.assertEqual(login_res.status_code, 200)
        login_data = login_res.json()
        self.assertIn("access_token", login_data)
        token = login_data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 3. View & Update profile
        profile_res = self.client.get("/api/customer/profile", headers=headers)
        self.assertEqual(profile_res.status_code, 200)
        self.assertEqual(profile_res.json()["email"], "beauty@lover.com")

        update_payload = {
            "name": "Beauty Enthusiast",
            "profile_picture": "http://example.com/pic.jpg"
        }
        update_res = self.client.put("/api/customer/profile", json=update_payload, headers=headers)
        self.assertEqual(update_res.status_code, 200)
        self.assertEqual(update_res.json()["name"], "Beauty Enthusiast")
        self.assertEqual(update_res.json()["profile_picture"], "http://example.com/pic.jpg")

        # 4. Change password
        change_pw_payload = {
            "old_password": "secretpassword",
            "new_password": "newsupersecret"
        }
        change_res = self.client.post("/api/customer/change-password", json=change_pw_payload, headers=headers)
        self.assertEqual(change_res.status_code, 200)

        # Login with old password should now fail
        bad_login_res = self.client.post("/api/customer/login", json=login_payload)
        self.assertEqual(bad_login_res.status_code, 401)

        # Login with new password should succeed
        login_payload["password"] = "newsupersecret"
        good_login_res = self.client.post("/api/customer/login", json=login_payload)
        self.assertEqual(good_login_res.status_code, 200)

        # 5. Reset password
        reset_pw_payload = {
            "phone": "9876543210",
            "email": "beauty@lover.com",
            "new_password": "resetpassword123"
        }
        reset_res = self.client.post("/api/customer/reset-password", json=reset_pw_payload)
        self.assertEqual(reset_res.status_code, 200)

        # Login with reset password
        login_payload["password"] = "resetpassword123"
        reset_login_res = self.client.post("/api/customer/login", json=login_payload)
        self.assertEqual(reset_login_res.status_code, 200)
        new_token = reset_login_res.json()["access_token"]
        new_headers = {"Authorization": f"Bearer {new_token}"}

        # 6. Wishlist update & retrieval
        wishlist_payload = [1, 2, 3]
        wishlist_res = self.client.put("/api/customer/wishlist", json=wishlist_payload, headers=new_headers)
        self.assertEqual(wishlist_res.status_code, 200)
        self.assertEqual(wishlist_res.json()["wishlist"], [1, 2, 3])

        # Verify wishlist is synced in profile call
        profile_after_wish = self.client.get("/api/customer/profile", headers=new_headers)
        self.assertEqual(profile_after_wish.status_code, 200)
        self.assertEqual(profile_after_wish.json()["wishlist"], [1, 2, 3])

        # 7. Customer orders retrieval
        orders_res = self.client.get("/api/customer/orders", headers=new_headers)
        self.assertEqual(orders_res.status_code, 200)
        self.assertEqual(orders_res.json(), [])

if __name__ == "__main__":
    unittest.main()
