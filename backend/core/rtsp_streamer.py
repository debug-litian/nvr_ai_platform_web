"""
rtsp_streamer.py — RTSP 流媒体引擎

功能:
1. probe_stream() — 调用 ffprobe 解析摄像机参数（编码/分辨率/帧率/码率）
2. transcode_stream() — ffmpeg H.265→H.264 实时转码，输出 fMP4 片段
3. start_transcode() — 完整转码→WebSocket 推流协程

依赖: 系统安装 ffmpeg + ffprobe (已安装 v8.1.1)
"""

import asyncio
import json
import subprocess
import logging
from typing import AsyncGenerator, Optional, Dict, Any

logger = logging.getLogger("rtsp_streamer")


async def probe_stream(rtsp_url: str, timeout: float = 15.0) -> Dict[str, Any]:
    """
    调用 ffprobe 解析 RTSP 流参数。

    返回:
    {
        "stream_status": "PASS" | "FAIL",
        "video_codec": "hevc" | "h264" | ...,
        "audio_codec": "aac" | "pcm_alaw" | ... | null,
        "resolution": "1920x1080",
        "width": 1920,
        "height": 1080,
        "fps": 25.0,
        "bitrate_kbps": 2048,
        "h265_supported": true | false,
        "error": null | "错误信息"
    }
    """
    result = {
        "stream_status": "FAIL",
        "video_codec": None,
        "audio_codec": None,
        "resolution": None,
        "width": None,
        "height": None,
        "fps": None,
        "bitrate_kbps": None,
        "h265_supported": False,
        "error": None,
    }

    cmd = [
        "ffprobe",
        "-v", "quiet",
        "-print_format", "json",
        "-show_streams",
        "-rtsp_transport", "tcp",
        "-timeout", str(int(timeout * 1000000)),  # 微秒
        rtsp_url,
    ]

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout + 5)

        if proc.returncode != 0:
            result["error"] = stderr.decode("utf-8", errors="replace")[:500]
            return result

        data = json.loads(stdout.decode("utf-8"))
        streams = data.get("streams", [])

        for s in streams:
            codec_type = s.get("codec_type")
            codec_name = s.get("codec_name", "")

            if codec_type == "video":
                result["video_codec"] = codec_name
                result["width"] = s.get("width")
                result["height"] = s.get("height")
                if result["width"] and result["height"]:
                    result["resolution"] = f"{result['width']}x{result['height']}"

                # 帧率: 优先取 avg_frame_rate，fallback r_frame_rate
                fps_str = s.get("avg_frame_rate", "0/1")
                try:
                    num, den = fps_str.split("/")
                    result["fps"] = round(float(num) / float(den), 1) if den != "0" else None
                except (ValueError, ZeroDivisionError):
                    result["fps"] = None

                # 码率
                br = s.get("bit_rate")
                if br:
                    result["bitrate_kbps"] = int(int(br) / 1000)

                # H.265 检测
                if codec_name and codec_name.lower() in ("hevc", "h265", "hvc1", "hev1"):
                    result["h265_supported"] = True

            elif codec_type == "audio":
                result["audio_codec"] = codec_name

        result["stream_status"] = "PASS"

    except asyncio.TimeoutError:
        result["error"] = f"ffprobe 超时 ({timeout}s)"
    except json.JSONDecodeError:
        result["error"] = "ffprobe 输出解析失败"
    except Exception as e:
        result["error"] = str(e)[:500]

    return result


async def transcode_stream(
    rtsp_url: str,
    stop_event: asyncio.Event,
    video_size: str = "1280:720",   # 转码输出分辨率
    video_bitrate: str = "1500k",
) -> AsyncGenerator[bytes, None]:
    """
    ffmpeg 实时转码: RTSP → H.264 fMP4 片段流。
    使用 TCP 传输避免 UDP 丢包，ultrafast 预设降低延迟。

    输出格式: fMP4 (fragmented MP4)，每个关键帧一个 moof+mdat 片段，
    前端通过 MediaSource API 追加播放。
    """
    cmd = [
        "ffmpeg",
        "-rtsp_transport", "tcp",
        "-i", rtsp_url,
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-tune", "zerolatency",
        "-vf", f"scale={video_size}",
        "-b:v", video_bitrate,
        "-an",  # 暂不转音频
        "-f", "mp4",
        "-movflags", "frag_keyframe+empty_moov+default_base_moof",
        "-g", "30",         # 每30帧一个关键帧
        "-keyint_min", "30",
        "-sc_threshold", "0",
        "-bufsize", "2000k",
        "-max_delay", "500000",  # 500ms
        "-threads", "2",
        "-loglevel", "error",
        "pipe:1",
    ]

    logger.info("启动 ffmpeg 转码: %s", rtsp_url)

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    try:
        while not stop_event.is_set() and proc.returncode is None:
            try:
                chunk = await asyncio.wait_for(proc.stdout.read(32768), timeout=2.0)
            except asyncio.TimeoutError:
                proc.returncode = proc.returncode
                continue

            if not chunk:
                await asyncio.sleep(0.1)
                proc.returncode = proc.returncode
                continue

            yield chunk

    except Exception as e:
        logger.error("转码异常: %s", e)
    finally:
        logger.info("停止 ffmpeg 转码")
        stop_event.set()
        try:
            proc.terminate()
            await asyncio.wait_for(proc.wait(), timeout=3.0)
        except Exception:
            proc.kill()


async def start_transcode(rtsp_url: str, ws, stop_event: asyncio.Event) -> None:
    """
    完整转码→WebSocket 推流协程。

    1. 先 probe 获取元数据 → 发送 metadata 消息
    2. 启动转码 → 逐片段发送 segment 消息
    3. 停止时发送 stopped 消息
    """
    # 1. 探测参数
    meta = await probe_stream(rtsp_url)
    await ws.send_json({"type": "metadata", "data": meta})

    if meta["stream_status"] == "FAIL":
        await ws.send_json({"type": "error", "data": {"message": meta.get("error", "探测失败")}})
        return

    # 2. 转码推流
    chunk_count = 0
    try:
        async for chunk in transcode_stream(rtsp_url, stop_event):
            if stop_event.is_set():
                break
            await ws.send_bytes(chunk)
            chunk_count += 1
    except Exception as e:
        logger.exception("推流异常")
        await ws.send_json({"type": "error", "data": {"message": str(e)}})
    finally:
        await ws.send_json({"type": "stopped", "data": {"chunks_sent": chunk_count}})
