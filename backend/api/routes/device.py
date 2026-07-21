"""
api/routes/device.py — 设备控制 API
"""

from fastapi import APIRouter, HTTPException

from config import settings
from api.models.schemas import NvrControlRequest, NvrControlResponse
from utils.logger import get_logger

logger = get_logger("api.device")

router = APIRouter(prefix="/api", tags=["device"])


def _get_device():
    from core.reolink_device import ReolinkDevice
    return ReolinkDevice(
        host=settings.NVR_HOST,
        username=settings.NVR_USERNAME,
        password=settings.NVR_PASSWORD,
    )


@router.get("/device/info")
def device_info():
    try:
        dev = _get_device()
        dev.connect()
        info = dev.get_device_info()
        dev.disconnect()
        return info.to_dict()
    except ImportError:
        raise HTTPException(status_code=503, detail="reolink-aio 不可用（需要 Python 3.11+）")
    except Exception as e:
        logger.exception("获取设备信息失败")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/device/ai-states")
def ai_states():
    try:
        dev = _get_device()
        dev.connect()
        states = dev.get_ai_states()
        dev.disconnect()
        return {"ai_states": [s.__dict__ if hasattr(s, "__dict__") else s for s in (states or [])]}
    except ImportError:
        raise HTTPException(status_code=503, detail="reolink-aio 不可用（需要 Python 3.11+）")
    except Exception as e:
        logger.exception("获取 AI 状态失败")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/device/control", response_model=NvrControlResponse)
def device_control(req: NvrControlRequest):
    try:
        dev = _get_device()
        dev.connect()
        a, ch, en = req.action, req.channel or 0, req.enabled if req.enabled is not None else True

        if a == "set_ir_lights":
            ok = dev.set_ir_lights(ch, en)
            msg = f"通道{ch} IR灯{'开' if en else '关'}"
        elif a == "reboot":
            ok = dev.reboot()
            msg = "设备重启中"
        else:
            dev.disconnect()
            raise HTTPException(400, f"不支持的操作: {a}")

        dev.disconnect()
        return NvrControlResponse(success=ok, action=a, message=msg)
    except ImportError:
        raise HTTPException(status_code=503, detail="reolink-aio 不可用（需要 Python 3.11+）")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
