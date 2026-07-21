"""
camera_report.py — 摄像机参数采集报告数据库模型 (SQLite)
"""

import sqlite3
import os
from datetime import datetime

_DB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "camera_reports.db")


def _get_conn() -> sqlite3.Connection:
    """获取数据库连接（自动创建目录和表）"""
    os.makedirs(os.path.dirname(_DB_PATH), exist_ok=True)
    conn = sqlite3.connect(_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """创建数据表（幂等）"""
    conn = _get_conn()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS camera_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            camera_name TEXT DEFAULT '',
            rtsp_url TEXT NOT NULL,
            video_codec TEXT DEFAULT '',
            audio_codec TEXT DEFAULT '',
            resolution TEXT DEFAULT '',
            width INTEGER DEFAULT 0,
            height INTEGER DEFAULT 0,
            fps REAL DEFAULT 0,
            bitrate_kbps INTEGER DEFAULT 0,
            h265_supported INTEGER DEFAULT 0,
            stream_status TEXT DEFAULT 'UNKNOWN',
            latency_ms INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now', 'localtime'))
        )
    """)
    conn.commit()
    conn.close()


def save_report(data: dict) -> int:
    """保存采集报告，返回自增 ID"""
    conn = _get_conn()
    cur = conn.execute(
        """INSERT INTO camera_reports
           (camera_name, rtsp_url, video_codec, audio_codec, resolution,
            width, height, fps, bitrate_kbps, h265_supported, stream_status, latency_ms)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
        (
            data.get("camera_name", ""),
            data.get("rtsp_url", ""),
            data.get("video_codec", ""),
            data.get("audio_codec", ""),
            data.get("resolution", ""),
            data.get("width", 0),
            data.get("height", 0),
            data.get("fps", 0),
            data.get("bitrate_kbps", 0),
            1 if data.get("h265_supported") else 0,
            data.get("stream_status", "UNKNOWN"),
            data.get("latency_ms", 0),
        ),
    )
    conn.commit()
    row_id = cur.lastrowid
    conn.close()
    return row_id


def get_reports(
    camera_name: str = "",
    date_from: str = "",
    date_to: str = "",
    limit: int = 50,
) -> list:
    """查询历史报告，支持筛选"""
    conn = _get_conn()
    sql = "SELECT * FROM camera_reports WHERE 1=1"
    params: list = []

    if camera_name:
        sql += " AND camera_name LIKE ?"
        params.append(f"%{camera_name}%")
    if date_from:
        sql += " AND created_at >= ?"
        params.append(date_from)
    if date_to:
        sql += " AND created_at <= ?"
        params.append(date_to)

    sql += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)

    rows = conn.execute(sql, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def export_csv(date_from: str = "", date_to: str = "") -> str:
    """导出为 CSV 字符串"""
    reports = get_reports(date_from=date_from, date_to=date_to, limit=10000)
    if not reports:
        return "ID,摄像机名称,RTSP地址,编码,分辨率,帧率,码率,H265支持,状态,时间\n"

    header = ["ID", "摄像机名称", "RTSP地址", "视频编码", "音频编码", "分辨率",
              "帧率", "码率(kbps)", "H.265支持", "拉流状态", "延迟(ms)", "采集时间"]
    lines = [",".join(header)]
    for r in reports:
        lines.append(",".join(str(r.get(k.replace(" ", "_").lower(), "")) for k in [
            "ID", "camera_name", "rtsp_url", "video_codec", "audio_codec",
            "resolution", "fps", "bitrate_kbps",
            "h265_supported", "stream_status", "latency_ms", "created_at"
        ] if False))  # placeholder, use actual mapping

    # 简化版
    for r in reports:
        row = [
            str(r.get("id", "")),
            r.get("camera_name", ""),
            r.get("rtsp_url", ""),
            r.get("video_codec", ""),
            r.get("audio_codec", ""),
            r.get("resolution", ""),
            str(r.get("fps", "")),
            str(r.get("bitrate_kbps", "")),
            "是" if r.get("h265_supported") else "否",
            r.get("stream_status", ""),
            str(r.get("latency_ms", "")),
            r.get("created_at", ""),
        ]
        # CSV 转义
        escaped = [f'"{v}"' if "," in v else v for v in row]
        lines.append(",".join(escaped))

    return "\n".join(lines)


# 应用启动时自动初始化表
init_db()
