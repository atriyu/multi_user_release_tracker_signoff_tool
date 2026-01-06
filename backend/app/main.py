from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.api import products, templates, releases, signoffs, stakeholders, dashboard, audit, users, product_permissions, user_permissions

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description="Release Management & Sign-off Workflow System",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(products.router, prefix=settings.api_prefix, tags=["Products"])
app.include_router(templates.router, prefix=settings.api_prefix, tags=["Templates"])
app.include_router(releases.router, prefix=settings.api_prefix, tags=["Releases"])
app.include_router(signoffs.router, prefix=settings.api_prefix, tags=["Sign-offs"])
app.include_router(stakeholders.router, prefix=settings.api_prefix, tags=["Stakeholders"])
app.include_router(dashboard.router, prefix=settings.api_prefix, tags=["Dashboard"])
app.include_router(audit.router, prefix=settings.api_prefix, tags=["Audit"])
app.include_router(users.router, prefix=settings.api_prefix, tags=["Users"])
app.include_router(user_permissions.router, prefix=settings.api_prefix, tags=["User Permissions"])
app.include_router(product_permissions.router, prefix=settings.api_prefix, tags=["Permissions"])


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
