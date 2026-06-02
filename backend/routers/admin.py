import os
import secrets
from fastapi import APIRouter, HTTPException
from schemas import AdminLogin, AdminLoginResponse

router = APIRouter()

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")


@router.post("/admin/login", response_model=AdminLoginResponse)
async def admin_login(payload: AdminLogin):
    """Login simple por contraseña fija (no es seguridad real, solo separa vistas)."""
    user_ok = secrets.compare_digest(payload.username, ADMIN_USERNAME)
    pass_ok = secrets.compare_digest(payload.password, ADMIN_PASSWORD)
    if not (user_ok and pass_ok):
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")
    # Token simple — suficiente para una demo académica
    return AdminLoginResponse(status="ok", token=secrets.token_hex(16))
