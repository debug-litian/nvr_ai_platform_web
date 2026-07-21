"""
api/routes/streaming.py — RTSP 流媒体 + 摄像机参数采集 API

端点:
- GET  /api/stream/probe?url=...     — ffprobe 解析摄像机参数
- WS   /ws/stream                    — WebSocket: RTSP转码推流
- POST /api/camera/report            — 保存采集报告
- GET  /api/camera/reports           — 查询历史报告
- GET  /api/camera/reports/export    — 导出 CSV
"""

import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.responses import PlainTextResponse

from core.rtsp_streamer import probe_stream, start_transcode
from api.models.camera_report import save_report, get_reports, export_csv
from utils.logger import get_logger

logger = get_logger("api.streaming")

router = APIRouter(tags=["streaming"])


# ════════════════════════════════════
# RTSP 流参数探测
# ════════════════════════════════════

@router.get("/api/stream/probe")
async def probe(rtsp_url: str = Query("", description="RTSP 流地址")):
    """调用 ffprobe 解析 RTSP 流的编码参数"""
    if not rtsp_url:
        raise HTTPException(400, "缺少 rtsp_url 参数")
    result = await probe_stream(rtsp_url)
    return result


# ════════════════════════════════════
# WebSocket 转码推流
# ════════════════════════════════════

@router.websocket("/ws/stream")
async def ws_stream(ws: WebSocket):
    """
    WebSocket 推流端点。

    客户端发送: {"action": "start", "rtsp_url": "..."}
    服务端推送:
      - {"type": "metadata", "data": {...}}   — 摄像机参数
      - <binary fMP4 segment>                  — 视频片段
      - {"type": "detections", ...}            — AI 检测框(预留)
      - {"type": "stopped", ...}               — 停止
      - {"type": "error", "data": {...}}       — 错误
    """
    await ws.accept()
    logger.info("WebSocket 流客户端已连接")

    stop_event = asyncio.Event()
    transcode_task = None

    try:
        # 等待客户端发送 start 指令
        raw = await ws.receive_text()
        import json as _json
        msg = _json.loads(raw)

        if msg.get("action") != "start":
            await ws.send_json({"type": "error", "data": {"message": "请先发送 {action: 'start', rtsp_url: '...'}"}})
            return

        rtsp_url = msg.get("rtsp_url", "")
        if not rtsp_url:
            await ws.send_json({"type": "error", "data": {"message": "缺少 rtsp_url"}})
            return

        # 启动转码推流
        transcode_task = asyncio.create_task(start_transcode(rtsp_url, ws, stop_event))

        # 监听客户端 stop 指令
        while True:
            try:
                raw2 = await asyncio.wait_for(ws.receive_text(), timeout=1.0)
                msg2 = _json.loads(raw2)
                if msg2.get("action") == "stop":
                    break
            except asyncio.TimeoutError:
                continue

    except WebSocketDisconnect:
        logger.info("WebSocket 流客户端断开")
    except Exception as e:
        logger.exception("WebSocket 流异常")
    finally:
        stop_event.set()
        if transcode_task:
            transcode_task.cancel()
            try:
                await transcode_task
            except asyncio.CancelledError:
                pass
        try:
            await ws.close()
        except Exception:
            pass


# ════════════════════════════════════
# 摄像机参数采集报告
# ════════════════════════════════════

@router.post("/api/camera/report")
async def create_report(data: dict):
    """保存摄像机参数采集报告"""
    if not data.get("rtsp_url"):
        raise HTTPException(400, "缺少 rtsp_url")
    report_id = save_report(data)
    return {"status": "ok", "id": report_id}


@router.get("/api/camera/reports")
async def list_reports(
    camera_name: str = Query(""),
    date_from: str = Query(""),
    date_to: str = Query(""),
):
    """查询历史采集报告"""
    reports = get_reports(
        camera_name=camera_name,
        date_from=date_from,
        date_to=date_to,
    )
    return {"reports": reports, "count": len(reports)}


@router.get("/api/camera/reports/export")
async def export_reports(
    date_from: str = Query(""),
    date_to: str = Query(""),
):
    """导出采集报告为 CSV"""
    csv_content = export_csv(date_from=date_from, date_to=date_to)
    return PlainTextResponse(csv_content, media_type="text/csv")
