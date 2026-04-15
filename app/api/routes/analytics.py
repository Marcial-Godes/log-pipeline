from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.log import Log

# 🔥 IMPORTANTE
from app.main import manager

router = APIRouter(prefix="/logs/stats", tags=["analytics"])


# =========================
# SUMMARY
# =========================
@router.get("/summary")
def get_summary(db: Session = Depends(get_db)):
    total = db.query(func.count(Log.id)).scalar() or 0

    success = (
        db.query(func.count(Log.id))
        .filter(Log.status_code < 400)
        .scalar()
        or 0
    )

    errors = (
        db.query(func.count(Log.id))
        .filter(Log.status_code >= 400)
        .scalar()
        or 0
    )

    return {
        "total": int(total),
        "success": int(success),
        "errors": int(errors),
    }


# =========================
# TOP ENDPOINTS
# =========================
@router.get("/top-endpoints")
def top_endpoints(db: Session = Depends(get_db)):
    results = (
        db.query(Log.endpoint, func.count(Log.id).label("count"))
        .group_by(Log.endpoint)
        .order_by(func.count(Log.id).desc())
        .limit(5)
        .all()
    )

    return [
        {"endpoint": r.endpoint, "count": int(r.count)}
        for r in results
    ]


# =========================
# STATUS DISTRIBUTION
# =========================
@router.get("/status-distribution")
def status_distribution(db: Session = Depends(get_db)):
    results = (
        db.query(Log.status_code, func.count(Log.id))
        .group_by(Log.status_code)
        .all()
    )

    return [
        {"status": r[0], "count": int(r[1])}
        for r in results
    ]


# =========================
# 🔥 REALTIME ALERT CHECK
# =========================
last_error_count = 0


@router.get("/realtime-check")
async def realtime_check(db: Session = Depends(get_db)):
    global last_error_count

    errors = (
        db.query(func.count(Log.id))
        .filter(Log.status_code >= 400)
        .scalar()
        or 0
    )

    # 🔥 SOLO SI AUMENTAN LOS ERRORES
    if errors > last_error_count:
        await manager.broadcast({
            "type": "error",
            "message": f"Errores totales: {errors}",
        })

    last_error_count = errors

    return {"errors": errors}
