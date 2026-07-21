"""
api/routes/monitor.py — WebSocket 实时推送

端点:
- WS /ws/monitor — 推送核验进度和结果更新
"""

import asyncio
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from api.routes.verification import (
    _verification_lock,
    _verification_results,
    _monitoring_active,
    _verification_worker,
)
from utils.logger import get_logger

logger = get_logger("api.monitor")

router = APIRouter(tags=["monitor"])


@router.websocket("/ws/monitor")
async def websocket_monitor(websocket: WebSocket):
    """WebSocket 实时推送核验进度"""
    await websocket.accept()
    logger.info("WebSocket 客户端已连接")

    sent_index = 0

    try:
        while True:
            # 检查新结果
            with _verification_lock:
                new_items = list(_verification_results[sent_index:])
                sent_index = len(_verification_results)

            # 推送新完成的核验结果
            for item in new_items:
                await websocket.send_json({
                    "type": "verification_complete",
                    "data": item,
                })

            # 推送当前状态
            if _monitoring_active and _verification_worker:
                await websocket.send_json({
                    "type": "status",
                    "data": {
                        "monitoring": True,
                        "pending": _verification_worker.pending_count,
                        "total_completed": sent_index,
                    },
                })
            else:
                await websocket.send_json({
                    "type": "status",
                    "data": {
                        "monitoring": False,
                        "pending": 0,
                        "total_completed": sent_index,
                    },
                })

            await asyncio.sleep(1.0)

    except WebSocketDisconnect:
        logger.info("WebSocket 客户端已断开")
    except Exception as e:
        logger.exception("WebSocket 异常: %s", e)
        try:
            await websocket.close()
        except Exception:
            pass
