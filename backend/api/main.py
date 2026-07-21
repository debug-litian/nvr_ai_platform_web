"""
api/main.py — FastAPI 应用入口
NVR AI Platform Web API
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import verification, device, monitor, streaming, report_api, rtsp_routes, security

app = FastAPI(title="NVR AI Platform API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(verification.router)
app.include_router(device.router)
app.include_router(monitor.router)
app.include_router(streaming.router)
app.include_router(report_api.router)
app.include_router(rtsp_routes.router)
app.include_router(security.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "NVR AI Platform API", "version": "1.0.0"}
