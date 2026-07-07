from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import AuditLog
from schemas import AuditLogOut
from deps import require_doctor

router = APIRouter()


@router.get("/audit", response_model=list[AuditLogOut])
async def list_audit(
    _admin=Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(AuditLog).order_by(AuditLog.id.desc()).limit(200))
    return list(result.scalars().all())
