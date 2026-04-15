from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.log import Log

# 🔥 FIX IMPORT (SIN CIRCULAR)
from app.websocket.manager import manager

router = APIRouter(prefix="/logs", tags=["logs"])


# =========================
# CREATE LOG 🔥 (EMITE WS)
# =========================
@router.post("/")
async def create_log(
    endpoint: str,
    method: str,
    status_code: int,
    db: Session = Depends(get_db),
):
    log = Log(
        endpoint=endpoint,
        method=method,
        status_code=status_code,
    )

    db.add(log)
    db.commit()
    db.refresh(log)

    # 🔥 EMITIMOS EVENTO REALTIME
    try:
        await manager.broadcast({
            "type": "new_log",
            "data": {
                "id": log.id,
                "endpoint": log.endpoint,
                "method": log.method,
                "status_code": log.status_code,
            },
        })
    except Exception as e:
        print("WS broadcast error:", e)

    return log


# =========================
# GET RECENT
# =========================
@router.get("/recent")
def get_recent_logs(db: Session = Depends(get_db)):
    logs = (
        db.query(Log)
        .order_by(Log.id.desc())
        .limit(50)
        .all()
    )

    return [
        {
            "id": l.id,
            "endpoint": l.endpoint,
            "method": l.method,
            "status_code": l.status_code,
        }
        for l in logs
    ]