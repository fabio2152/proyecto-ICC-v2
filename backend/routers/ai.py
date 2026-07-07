from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from deps import resolve_device
from schemas import AiConfigIn, AiStatusOut, AiAnalyzeIn, AiAnalyzeOut
from services.ai import get_api_key, set_api_key, run_analysis

router = APIRouter()


@router.get("/ai/status", response_model=AiStatusOut)
async def ai_status(db: AsyncSession = Depends(get_db)):
    key = await get_api_key(db)
    return AiStatusOut(configured=key is not None)


@router.post("/ai/config", response_model=AiStatusOut)
async def ai_config(payload: AiConfigIn, db: AsyncSession = Depends(get_db)):
    await set_api_key(db, payload.api_key.strip())
    return AiStatusOut(configured=True)


@router.post("/ai/analyze", response_model=AiAnalyzeOut)
async def ai_analyze(
    payload: AiAnalyzeIn,
    patient_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    device = await resolve_device(db, patient_id)
    text = await run_analysis(db, device, payload.type)
    return AiAnalyzeOut(text=text)
