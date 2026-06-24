import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn

from database import init_db
from websocket_manager import manager
from routers import admin, user, seller, category, product, product_image, address

# Create uploads folder if it doesn't exist
os.makedirs("uploads", exist_ok=True)

app = FastAPI(title="hellobeauty Marketplace API", version="1.0.0")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development ease
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database tables
@app.on_event("startup")
def startup_event():
    init_db()

# Mount uploaded media directory
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# --- WebSocket routing ---
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive; discard incoming text for now
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# --- Register Modular Routers ---
app.include_router(admin.router, prefix="/api")
app.include_router(user.router, prefix="/api")
app.include_router(seller.router, prefix="/api")
app.include_router(category.router, prefix="/api")
app.include_router(product.router, prefix="/api")
app.include_router(product_image.router, prefix="/api")
app.include_router(address.router, prefix="/api")

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
