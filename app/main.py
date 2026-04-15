from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import logs, analytics
from app.database import Base, engine, SessionLocal
from app.models.log import Log

import json

app = FastAPI()

# =========================
# WS MANAGER
# =========================
class ConnectionManager:
    def __init__(self):
        self.active_connections = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print("🟢 WS connected")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        print("🔴 WS disconnected")

    async def broadcast(self, data: dict):
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(data))
            except:
                pass


manager = ConnectionManager()

# =========================
# WEBSOCKET ENDPOINT 🔥
# =========================
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# =========================
# DB INIT
# =========================
def init_db():
    Base.metadata.create_all(bind=engine)

@app.on_event("startup")
def startup_event():
    init_db()

    db = SessionLocal()

    if db.query(Log).count() == 0:
        sample_logs = [
            Log(endpoint="/login", method="POST", status_code=200),
            Log(endpoint="/orders", method="GET", status_code=200),
        ]

        for log in sample_logs:
            db.add(log)

        db.commit()

    db.close()

# =========================
# HEALTH
# =========================
@app.get("/health")
def health():
    return {"status": "ok"}

# =========================
# CORS
# =========================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# ROUTES
# =========================
app.include_router(logs.router)
app.include_router(analytics.router)