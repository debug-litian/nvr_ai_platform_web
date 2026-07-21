"""
api/models/schemas.py — Pydantic 数据模型
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class VerificationRequest(BaseModel):
    watch_dir: Optional[str] = None


class VerificationStatusResponse(BaseModel):
    status: str
    message: str = ""
    total_results: int = 0


class VerificationResultsResponse(BaseModel):
    status: str
    count: int
    results: List[Dict[str, Any]]


class NvrControlRequest(BaseModel):
    action: str
    channel: Optional[int] = 0
    enabled: Optional[bool] = True


class NvrControlResponse(BaseModel):
    success: bool
    action: Optional[str] = None
    message: str
