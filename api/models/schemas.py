"""
api/models/schemas.py — Pydantic 请求/响应数据模型
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


# ═══════════════════════════════════════════════════════════
# 核验相关
# ═══════════════════════════════════════════════════════════

class VerificationRequest(BaseModel):
    """启动核验请求"""
    watch_dir: Optional[str] = None  # FTP 监控目录，默认使用 settings.FTP_UPLOAD_DIR


class VerificationResponse(BaseModel):
    """通用核验响应"""
    status: str
    message: str


class VerificationResultsResponse(BaseModel):
    """核验结果列表响应"""
    status: str               # "running" / "stopped" / "idle"
    count: int
    results: List[Dict[str, Any]]


# ═══════════════════════════════════════════════════════════
# 设备控制相关
# ═══════════════════════════════════════════════════════════

class NvrControlRequest(BaseModel):
    """NVR 设备控制请求"""
    action: str               # "reboot", "set_ir_lights", "set_spotlight", "set_siren"
    channel: Optional[int] = 0
    enabled: Optional[bool] = True


class NvrControlResponse(BaseModel):
    """设备控制响应"""
    success: bool
    action: Optional[str] = None
    message: str


# ═══════════════════════════════════════════════════════════
# 报告相关
# ═══════════════════════════════════════════════════════════

class ReportQueryParams(BaseModel):
    """报告查询参数"""
    format: Optional[str] = "json"  # "json" / "csv" / "html"


class HealthResponse(BaseModel):
    """健康检查"""
    status: str
    service: str
    version: str = "1.0.0"
