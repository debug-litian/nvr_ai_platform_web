"""
api/routes/rtsp_routes.py — RTSP 流参数采集与测试报告生成

端点:
- POST /api/rtsp/collect — 采集摄像机参数并保存到数据库
"""

import time
from fastapi import APIRouter, HTTPException
from core.rtsp_streamer import probe_stream
from api.models.camera_report import save_report
from utils.logger import get_logger

logger = get_logger("api.rtsp_routes")

router = APIRouter(prefix="/api/rtsp", tags=["rtsp"])


@router.post("/collect")
async def collect(data: dict):
    """
    采集摄像机 RTSP 流参数并保存到数据库。

    请求体:
    {
        "rtsp_url": "rtsp://admin:pass@192.168.124.7/Preview_04_main",
        "camera_name": "通道4-车库",
        其他字段可选
    }

    返回:
    {
        "status": "ok",
        "id": 1,
        "data": { ... 采集到的参数 ... }
    }
    """
    rtsp_url = data.get("rtsp_url", "")
    if not rtsp_url:
        raise HTTPException(400, "缺少 rtsp_url 参数")

    # 1. 探测流参数
    t0 = time.time()
    probe_result = await probe_stream(rtsp_url)
    latency_ms = int((time.time() - t0) * 1000)

    # 2. 合并数据
    record = {
        "camera_name": data.get("camera_name", rtsp_url),
        "rtsp_url": rtsp_url,
        "video_codec": probe_result.get("video_codec", ""),
        "audio_codec": probe_result.get("audio_codec", ""),
        "resolution": probe_result.get("resolution", ""),
        "width": probe_result.get("width", 0),
        "height": probe_result.get("height", 0),
        "fps": probe_result.get("fps", 0) or 0,
        "bitrate_kbps": probe_result.get("bitrate_kbps", 0) or 0,
        "h265_supported": probe_result.get("h265_supported", False),
        "stream_status": data.get("play_status") or probe_result.get("stream_status", "FAIL"),
        "latency_ms": latency_ms,
    }

    # 3. 保存到 SQLite
    report_id = save_report(record)

    logger.info("RTSP 采集完成: id=%d, codec=%s, resolution=%s",
                 report_id, record["video_codec"], record["resolution"])

    return {
        "status": "ok",
        "id": report_id,
        "data": record,
    }
