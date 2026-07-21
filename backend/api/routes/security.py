"""
api/routes/security.py — 安全扫描 API 路由

端点:
- POST /api/security/scan          — 触发安全扫描 (nmap/serial/busybox)
- GET  /api/security/scans         — 查询历史扫描记录
- GET  /api/security/scans/{id}    — 单条记录详情
- DELETE /api/security/scans/{id}  — 删除记录
"""

import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Query

from core.security_scanner import nmap_scan, serial_login_check, busybox_check
from api.models.security_scan_db import save_scan, get_scans, get_scan, delete_scan
from utils.logger import get_logger

logger = get_logger("api.security")

router = APIRouter(prefix="/api/security", tags=["security"])


# ════════════════════════════════
# 触发扫描
# ════════════════════════════════

@router.post("/scan")
async def trigger_scan(data: dict):
    """
    触发安全扫描。

    请求体:
    {
        "scan_type": "nmap",          // nmap | serial | busybox
        "target_ip": "192.168.124.2",
        "ports": "1-10000",           // 仅 nmap
        "scan_args": "-sV -T4",       // 仅 nmap, 可选
        "username": "root",           // 仅 busybox
        "password": "",               // 仅 busybox
        "serial_port": "COM1",        // 仅 serial
        "baudrate": 115200            // 仅 serial
    }
    """
    scan_type = data.get("scan_type", "nmap")
    target_ip = data.get("target_ip", "")
    save_args = data.get("ports") or data.get("scan_args", "")

    if not target_ip and scan_type != "serial":
        raise HTTPException(400, "缺少 target_ip 参数")
    if scan_type == "serial" and not data.get("serial_port"):
        raise HTTPException(400, "缺少 serial_port 参数")

    logger.info("安全扫描启动: type=%s target=%s", scan_type, target_ip)

    # 根据扫描类型调用不同的引擎
    if scan_type == "nmap":
        result = await nmap_scan(
            target_ip=target_ip,
            ports=data.get("ports", "1-10000"),
            scan_args=data.get("scan_args", "-sV -T4"),
        )
    elif scan_type == "serial":
        result = await serial_login_check(
            port=data.get("serial_port", "COM1"),
            baudrate=data.get("baudrate", 115200),
        )
    elif scan_type == "busybox":
        result = await busybox_check(
            target_ip=target_ip,
            username=data.get("username", "root"),
            password=data.get("password", ""),
        )
    else:
        raise HTTPException(400, f"不支持的扫描类型: {scan_type}")

    # 保存到数据库
    scan_id = save_scan(scan_type, target_ip, save_args, result)

    return {
        "status": "ok",
        "id": scan_id,
        "scan_type": scan_type,
        "result": result,
    }


# ════════════════════════════════
# 查询历史记录
# ════════════════════════════════

@router.get("/scans")
async def list_scans(
    scan_type: str = Query(""),
    limit: int = Query(50),
):
    """查询历史扫描记录，可按类型筛选"""
    scans = get_scans(limit=limit, scan_type=scan_type)
    return {"scans": scans, "count": len(scans)}


@router.get("/scans/{scan_id}")
async def scan_detail(scan_id: int):
    """获取单条扫描记录详情"""
    data = get_scan(scan_id)
    if not data:
        raise HTTPException(404, "扫描记录不存在")
    return data


@router.delete("/scans/{scan_id}")
async def remove_scan(scan_id: int):
    """删除扫描记录"""
    delete_scan(scan_id)
    return {"status": "ok"}
