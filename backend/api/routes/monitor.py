"""
api/routes/monitor.py — WebSocket 实时推送
"""

import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from api.routes.verification import _lock, _results, _active, _worker
from utils.logger import get_logger

logger = get_logger("api.monitor")

router = APIRouter(tags=["monitor"])


@router.websocket("/ws/monitor")
async def ws_monitor(ws: WebSocket):
    await ws.accept()
    sent = 0
    try:
        while True:
            with _lock:
                new = list(_results[sent:])
                sent = len(_results)
            for item in new:
                await ws.send_json({"type": "verification_complete", "data": item})
            if _active and _worker:
                await ws.send_json({"type": "status", "data": {"monitoring": True, "pending": _worker.pending_count, "total_completed": sent}})
            else:
                await ws.send_json({"type": "status", "data": {"monitoring": False, "pending": 0, "total_completed": sent}})
            await asyncio.sleep(1.0)
    except WebSocketDisconnect:
        pass
