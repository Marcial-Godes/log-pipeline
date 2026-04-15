from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import asyncio

from app.api.routes import logs, analytics
from app.database import Base, engine, SessionLocal
from app.models.log import Log
from app.websocket.manager import manager

app = FastAPI()

# =========================
# ROOT (IMPORTANTE PARA RENDER)
# =========================
@app.get("/")
def root():
    return {"message": "Log Pipeline API running"}

# =========================
# WEBSOCKET
# =========================
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)

    try:
        while True:
            await asyncio.sleep(10)
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