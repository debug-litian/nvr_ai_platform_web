"""
security_scan_db.py — 安全扫描结果数据库模型 (SQLite)

表: security_scans — Nmap/串口/Busybox 扫描记录
"""

import sqlite3
import os
import json
from datetime import datetime

_DB_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data")
_DB_PATH = os.path.join(_DB_DIR, "security_scans.db")


def _get_conn() -> sqlite3.Connection:
    os.makedirs(_DB_DIR, exist_ok=True)
    conn = sqlite3.connect(_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """建表（幂等）"""
    conn = _get_conn()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS security_scans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            target_ip TEXT DEFAULT '',
            scan_type TEXT DEFAULT '',              -- nmap / serial / busybox / nessus
            scan_args TEXT DEFAULT '',              -- 扫描参数
            result_json TEXT DEFAULT '',            -- JSON 格式结果
            scan_status TEXT DEFAULT 'PENDING',     -- PENDING / RUNNING / PASS / FAIL / SKIP
            details TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now','localtime'))
        );
    """)
    conn.commit()
    conn.close()


def save_scan(scan_type: str, target_ip: str, scan_args: str, result: dict) -> int:
    """保存扫描结果, 返回 ID"""
    conn = _get_conn()
    cur = conn.execute(
        """INSERT INTO security_scans (target_ip, scan_type, scan_args, result_json, scan_status, details)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (
            target_ip,
            scan_type,
            scan_args,
            json.dumps(result, ensure_ascii=False, default=str),
            result.get("scan_status") or result.get("check_status", "PENDING"),
            result.get("details", ""),
        ),
    )
    conn.commit()
    scan_id = cur.lastrowid
    conn.close()
    return scan_id


def get_scans(limit: int = 50, scan_type: str = "") -> list:
    """查询历史扫描记录"""
    conn = _get_conn()
    if scan_type:
        rows = conn.execute(
            "SELECT * FROM security_scans WHERE scan_type = ? ORDER BY created_at DESC LIMIT ?",
            (scan_type, limit),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM security_scans ORDER BY created_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
    conn.close()

    results = []
    for row in rows:
        d = dict(row)
        try:
            d["result"] = json.loads(d["result_json"])
        except (json.JSONDecodeError, TypeError):
            d["result"] = {}
        results.append(d)
    return results


def get_scan(scan_id: int) -> dict:
    """获取单条扫描记录详情"""
    conn = _get_conn()
    row = conn.execute("SELECT * FROM security_scans WHERE id = ?", (scan_id,)).fetchone()
    conn.close()
    if not row:
        return {}
    d = dict(row)
    try:
        d["result"] = json.loads(d["result_json"])
    except (json.JSONDecodeError, TypeError):
        d["result"] = {}
    return d


def delete_scan(scan_id: int):
    """删除扫描记录"""
    conn = _get_conn()
    conn.execute("DELETE FROM security_scans WHERE id = ?", (scan_id,))
    conn.commit()
    conn.close()


# 启动时初始化
init_db()
