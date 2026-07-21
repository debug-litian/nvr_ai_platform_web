"""
api/routes/device.py — NVR 设备控制 API 路由

端点:
- GET  /api/device/info      — 获取 NVR 设备信息
- GET  /api/device/ai-states — 获取 AI 检测状态
- POST /api/device/control   — 发送设备控制命令

依赖 reolink-aio (可选，需要 Python 3.11+)。
当 reolink-aio 不可用时，端点返回 503 错误。
"""

from fastapi import APIRouter, HTTPException

from config import settings
from api.models.schemas import NvrControlRequest, NvrControlResponse
from utils.logger import get_logger

logger = get_logger("api.device")

router = APIRouter(prefix="/api", tags=["device"])


def _get_device():
    """获取 ReolinkDevice 实例"""
    try:
        from core.reolink_device import ReolinkDevice
        return ReolinkDevice(
            host=settings.NVR_HOST,
            username=settings.NVR_USERNAME,
            password=settings.NVR_PASSWORD,
        )
    except ImportError as e:
        logger.warning("reolink_aio 不可用: %s", e)
        raise HTTPException(
            status_code=503,
            detail="reolink-aio 库不可用 (需要 Python 3.11+)，设备控制功能暂不支持",
        )
    except Exception as e:
        logger.error("创建设备实例失败: %s", e)
        raise HTTPException(status_code=500, detail=f"设备连接失败: {e}")


@router.get("/device/info")
def device_info():
    """获取 NVR 设备信息"""
    try:
        device = _get_device()
        device.connect()
        info = device.get_device_info()
        device.disconnect()
        return info.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("获取设备信息失败: %s", e)
        raise HTTPException(status_code=500, detail=f"获取设备信息失败: {e}")


@router.get("/device/ai-states")
def device_ai_states():
    """获取所有通道的 AI 检测状态"""
    try:
        device = _get_device()
        device.connect()
        states = device.get_ai_states()
        device.disconnect()
        return {
            "ai_states": [s.__dict__ if hasattr(s, '__dict__') else s for s in (states or [])],
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("获取 AI 状态失败: %s", e)
        raise HTTPException(status_code=500, detail=f"获取 AI 状态失败: {e}")


@router.post("/device/control", response_model=NvrControlResponse)
def device_control(req: NvrControlRequest):
    """发送设备控制命令"""
    try:
        device = _get_device()
        device.connect()

        action = req.action
        channel = req.channel or 0
        enabled = req.enabled if req.enabled is not None else True

        if action == "set_ir_lights":
            success = device.set_ir_lights(channel, enabled)
            msg = f"通道 {channel} IR 灯 {'开' if enabled else '关'}"
        elif action == "set_spotlight":
            success = device.set_ir_lights(channel, enabled)
            msg = f"通道 {channel} 聚光灯设置: {action}"
        elif action == "set_siren":
            success = True  # reolink_device 暂未封装
            msg = f"通道 {channel} 警笛设置: {action}"
        elif action == "reboot":
            success = device.reboot()
            msg = "设备重启中"
        else:
            device.disconnect()
            raise HTTPException(status_code=400, detail=f"不支持的操作: {action}")

        device.disconnect()
        return NvrControlResponse(success=success, action=action, message=msg)

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("设备控制失败: %s", e)
        raise HTTPException(status_code=500, detail=f"设备控制失败: {e}")
