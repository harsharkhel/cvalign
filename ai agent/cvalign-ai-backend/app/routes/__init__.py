from app.routes.auth_routes import router as auth_router
from app.routes.resume_routes import router as resume_router
from app.routes.admin_routes import router as admin_router

__all__ = ["auth_router", "resume_router", "admin_router"]
