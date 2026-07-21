"""
test_report_db.py — 测试报告数据库模型 (SQLite)

报告表: test_reports — L2 级测试报告主表
Bug表:   report_bugs  — 报告关联的 Bug 列表
"""

import sqlite3
import os
from datetime import datetime

_DB_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data")
_DB_PATH = os.path.join(_DB_DIR, "test_reports.db")


def _get_conn() -> sqlite3.Connection:
    os.makedirs(_DB_DIR, exist_ok=True)
    conn = sqlite3.connect(_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """建表（幂等）"""
    conn = _get_conn()
    conn.executescript("""
        -- L2 测试报告主表
        CREATE TABLE IF NOT EXISTS test_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_number TEXT NOT NULL UNIQUE,       -- 文件编号 R-L2-测试部-YYYYMMDDXXXXX
            version TEXT DEFAULT 'V0.1',            -- 版次
            project_name TEXT DEFAULT '',           -- 项目名称
            product_model TEXT DEFAULT '',          -- 产品型号
            firmware_version TEXT DEFAULT '',       -- 固件版本
            soc_info TEXT DEFAULT '',               -- SoC 型号
            switch_info TEXT DEFAULT '',            -- Switch 芯片
            flash_info TEXT DEFAULT '',             -- Flash
            ddr_info TEXT DEFAULT '',               -- DDR
            test_range TEXT DEFAULT '',             -- 测试范围
            test_strategy TEXT DEFAULT '',          -- 测试策略
            test_status TEXT DEFAULT 'DRAFT',       -- DRAFT / PUBLISHED
            preparer TEXT DEFAULT '',               -- 编制人
            product_manager TEXT DEFAULT '',        -- 产品经理
            project_manager TEXT DEFAULT '',        -- 项目经理
            dev_lead TEXT DEFAULT '',               -- 开发负责人
            hardware_lead TEXT DEFAULT '',          -- 硬件负责人
            structure_lead TEXT DEFAULT '',         -- 结构负责人
            test_lead TEXT DEFAULT '',              -- 测试负责人
            effective_date TEXT DEFAULT '',         -- 生效日期
            summary TEXT DEFAULT '',                -- 测试结论摘要
            created_at TEXT DEFAULT (datetime('now','localtime')),
            updated_at TEXT DEFAULT (datetime('now','localtime'))
        );

        -- Bug 清单表
        CREATE TABLE IF NOT EXISTS report_bugs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_id INTEGER NOT NULL REFERENCES test_reports(id),
            bug_number TEXT DEFAULT '',             -- Bug编号
            bug_title TEXT DEFAULT '',              -- Bug标题
            severity TEXT DEFAULT '',               -- Critical / Severe / Minor
            bug_status TEXT DEFAULT '',             -- Open / Fixed / WontFix
            solution TEXT DEFAULT ''                -- 解决方案
        );

        -- 测试大项执行表
        CREATE TABLE IF NOT EXISTS report_test_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_id INTEGER NOT NULL REFERENCES test_reports(id),
            category TEXT DEFAULT '',               -- 测试大项名称
            status TEXT DEFAULT '',                 -- 已执行 / 未执行 / 不适用
            result TEXT DEFAULT ''                  -- PASS / FAIL / N/A
        );

        -- 专项测试结果表
        CREATE TABLE IF NOT EXISTS report_sub_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_id INTEGER NOT NULL REFERENCES test_reports(id),
            sub_name TEXT DEFAULT '',               -- 专项名称 (图像/音频/Wi-Fi/拷机...)
            result TEXT DEFAULT '',                 -- PASS / FAIL
            detail TEXT DEFAULT ''                  -- 详细描述
        );
    """)
    conn.commit()
    conn.close()


# ---- CRUD ----

def create_report(data: dict) -> int:
    """创建报告，返回 ID"""
    conn = _get_conn()
    # 自动生成文件编号
    now = datetime.now()
    file_number = data.get("file_number") or f"R-L2-测试部-{now.strftime('%Y%m%d')}{now.microsecond % 10000:04d}"
    # 自动递增版次
    existing = conn.execute("SELECT version FROM test_reports ORDER BY id DESC LIMIT 1").fetchone()
    if existing and not data.get("version"):
        prev = float(existing["version"].replace("V", ""))
        version = f"V{prev + 0.1:.1f}"
    else:
        version = data.get("version") or "V0.1"

    cur = conn.execute(
        """INSERT INTO test_reports
           (file_number, version, project_name, product_model, firmware_version,
            soc_info, switch_info, flash_info, ddr_info,
            test_range, test_strategy, preparer, product_manager,
            project_manager, dev_lead, hardware_lead, structure_lead, test_lead,
            effective_date, summary)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (
            file_number, version,
            data.get("project_name", ""), data.get("product_model", ""),
            data.get("firmware_version", ""),
            data.get("soc_info", ""), data.get("switch_info", ""),
            data.get("flash_info", ""), data.get("ddr_info", ""),
            data.get("test_range", ""), data.get("test_strategy", ""),
            data.get("preparer", ""), data.get("product_manager", ""),
            data.get("project_manager", ""), data.get("dev_lead", ""),
            data.get("hardware_lead", ""), data.get("structure_lead", ""),
            data.get("test_lead", ""),
            data.get("effective_date", now.strftime("%Y-%m-%d")),
            data.get("summary", ""),
        ),
    )
    conn.commit()
    report_id = cur.lastrowid
    conn.close()
    return report_id


def save_bugs(report_id: int, bugs: list):
    """保存 Bug 列表"""
    conn = _get_conn()
    conn.execute("DELETE FROM report_bugs WHERE report_id = ?", (report_id,))
    for bug in bugs:
        conn.execute(
            "INSERT INTO report_bugs (report_id, bug_number, bug_title, severity, bug_status, solution) VALUES (?,?,?,?,?,?)",
            (report_id, bug.get("bug_number", ""), bug.get("bug_title", ""),
             bug.get("severity", ""), bug.get("bug_status", ""), bug.get("solution", "")),
        )
    conn.commit()
    conn.close()


def save_test_items(report_id: int, items: list):
    """保存测试大项"""
    conn = _get_conn()
    conn.execute("DELETE FROM report_test_items WHERE report_id = ?", (report_id,))
    for item in items:
        conn.execute(
            "INSERT INTO report_test_items (report_id, category, status, result) VALUES (?,?,?,?)",
            (report_id, item.get("category", ""), item.get("status", ""), item.get("result", "")),
        )
    conn.commit()
    conn.close()


def save_sub_items(report_id: int, items: list):
    """保存专项测试结果"""
    conn = _get_conn()
    conn.execute("DELETE FROM report_sub_items WHERE report_id = ?", (report_id,))
    for item in items:
        conn.execute(
            "INSERT INTO report_sub_items (report_id, sub_name, result, detail) VALUES (?,?,?,?)",
            (report_id, item.get("sub_name", ""), item.get("result", ""), item.get("detail", "")),
        )
    conn.commit()
    conn.close()


def get_report(report_id: int) -> dict:
    """获取单个报告完整数据"""
    conn = _get_conn()
    report = conn.execute("SELECT * FROM test_reports WHERE id = ?", (report_id,)).fetchone()
    if not report:
        conn.close()
        return {}
    data = dict(report)
    data["bugs"] = [dict(r) for r in conn.execute("SELECT * FROM report_bugs WHERE report_id = ?", (report_id,)).fetchall()]
    data["test_items"] = [dict(r) for r in conn.execute("SELECT * FROM report_test_items WHERE report_id = ?", (report_id,)).fetchall()]
    data["sub_items"] = [dict(r) for r in conn.execute("SELECT * FROM report_sub_items WHERE report_id = ?", (report_id,)).fetchall()]
    conn.close()
    return data


def list_reports(limit: int = 20) -> list:
    """列出所有报告摘要"""
    conn = _get_conn()
    rows = conn.execute(
        "SELECT id, file_number, version, project_name, product_model, firmware_version, test_status, preparer, created_at FROM test_reports ORDER BY created_at DESC LIMIT ?",
        (limit,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def update_report_status(report_id: int, status: str):
    conn = _get_conn()
    conn.execute("UPDATE test_reports SET test_status = ?, updated_at = datetime('now','localtime') WHERE id = ?", (status, report_id))
    conn.commit()
    conn.close()


# 启动时初始化
init_db()
