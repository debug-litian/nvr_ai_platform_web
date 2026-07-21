"""
api/main.py — FastAPI 应用入口

NVR AI Platform Web API:
- REST API: /api/verification/*, /api/device/*, /api/config-test/*
- WebSocket: /ws/monitor
- Swagger 文档: /docs
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import verification, device, monitor

# ═══════════════════════════════════════════════════════════
# 创建 FastAPI 应用
# ═══════════════════════════════════════════════════════════

app = FastAPI(
    title="NVR AI Platform API",
    description="Reolink NVR FTP 报警核验 & 设备控制 API",
    version="1.0.0",
)

# ═══════════════════════════════════════════════════════════
# CORS — 允许 Streamlit 前端跨域访问
# ═══════════════════════════════════════════════════════════

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8501",
        "http://127.0.0.1:8501",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ═══════════════════════════════════════════════════════════
# 注册路由
# ═══════════════════════════════════════════════════════════

app.include_router(verification.router)
app.include_router(device.router)
app.include_router(monitor.router)


# ═══════════════════════════════════════════════════════════
# 健康检查
# ═══════════════════════════════════════════════════════════

@app.get("/api/health")
def health():
    """健康检查端点"""
    return {
        "status": "ok",
        "service": "NVR AI Platform API",
        "version": "1.0.0",
    }


@app.on_event("startup")
async def startup():
    """应用启动时执行"""
    import logging
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
