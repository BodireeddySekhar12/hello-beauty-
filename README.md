# Hellobeauty Marketplace

Hellobeauty is a full-stack premium beauty marketplace application featuring a FastAPI backend and a modern React + Vite + TypeScript frontend.

---

## 🛠️ Technology Stack

### Frontend
- **Framework:** React 19
- **Build Tool:** Vite
- **Language:** TypeScript
- **Styling:** Vanilla CSS (curated HSL palettes, smooth gradients, premium modern look) & Tailwind CSS
- **Icon Library:** Lucide React

### Backend
- **Framework:** FastAPI
- **Web Server:** Uvicorn
- **Language:** Python 3.8+
- **ORM:** SQLAlchemy
- **Realtime Updates:** WebSockets (for live product updates/stock counts)

### Database
- **Database Engine:** SQLite (stored locally as `hellobeauty.db` for easy development)
- **Flexibility:** Powered by SQLAlchemy, making it easy to swap with PostgreSQL, MySQL, or MSSQL.

---

## ✨ Features

- **🛍️ Customer Shopping Portal:**
  - Dynamic product catalog, category filters, and detailed product views.
  - Wishlist management.
  - WhatsApp checkout integration (formats receipts and launches WhatsApp with purchase details).
- **🔒 Customer Authentication (Instant Registration):**
  - Instant signup and sign-in (OTP requirements bypassed for simplified signups).
  - Profile updates and forgot password recovery.
- **👑 Admin Console:**
  - Overview of registration stats and system health.
  - Complete product inventory management (create, update, delete).
  - Customer directory with a one-click **Delete Account** option.
  - Live order tracking log.
- **💼 Seller Console:**
  - Product upload, inventory logs, and performance charts.

---

## 🚀 How to Run the Project

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Python](https://www.python.org/) (v3.8 or higher)

---

### Step 1: Set Up & Run the Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```
3. Activate the virtual environment:
   - **Windows (PowerShell):**
     ```powershell
     venv\Scripts\Activate.ps1
     ```
   - **Windows (CMD):**
     ```cmd
     venv\Scripts\activate.bat
     ```
   - **macOS/Linux:**
     ```bash
     source venv/bin/activate
     ```
4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
5. Run the server:
   ```bash
   python main.py
   ```
   *The backend will start running on [http://127.0.0.1:8000](http://127.0.0.1:8000).*

---

### Step 2: Set Up & Run the Frontend

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend will start running on [http://localhost:5173](http://localhost:5173).*

---

## ⚙️ Configuration (`.env`)

You can create a `.env` file in the `backend/` folder to customize configurations:

```env
# Set to true for mock OTP logs (disabled by default since OTPs are bypassed)
MOCK_OTP=true

# Database Connection URL (Defaults to local SQLite)
DATABASE_URL=sqlite:///./hellobeauty.db

# JWT Configuration
JWT_SECRET=your_custom_secret_key_here
```
