"""
api/routes/report_api.py — 测试报告生成与下载 API

端点:
- POST /api/reports/generate     — 创建报告 + 填充数据 + 生成 Word
- POST /api/reports/create       — 仅创建报告记录 (不生成 Word)
- GET  /api/reports/list         — 报告列表
- GET  /api/reports/{id}         — 报告详情 (含 Bug/测试项)
- GET  /api/reports/{id}/download — 下载 .docx 文件
- POST /api/reports/{id}/bugs    — 添加 Bug
- POST /api/reports/{id}/items   — 添加测试大项
"""

import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
import io

from api.models.test_report_db import (
    create_report, get_report, list_reports,
    save_bugs, save_test_items, save_sub_items,
    update_report_status,
)
from core.report_generator import generate_l2_report, generate_report_bytes

router = APIRouter(prefix="/api/reports", tags=["reports"])


# ---- 创建报告 ----

@router.post("/create")
def create(data: dict):
    """创建报告记录（不含 Word 生成）"""
    report_id = create_report(data)
    return {"status": "ok", "id": report_id}


# ---- 生成完整报告 ----

@router.post("/generate")
def generate(data: dict):
    """
    创建报告 + 填充 Bug/测试项 + 生成 Word 文档。
    请求体示例:
    {
        "report": { "project_name": "...", ... },
        "bugs": [...],
        "test_items": [...],
        "sub_items": [...]
    }
    """
    report_data = data.get("report", {})
    bugs = data.get("bugs", [])
    test_items = data.get("test_items", [])
    sub_items = data.get("sub_items", [])

    # 1. 创建报告
    report_id = create_report(report_data)

    # 2. 填充关联数据
    if bugs:
        save_bugs(report_id, bugs)
    if test_items:
        save_test_items(report_id, test_items)
    if sub_items:
        save_sub_items(report_id, sub_items)

    # 3. 生成 Word
    try:
        output_path = generate_l2_report(report_id)
        update_report_status(report_id, "PUBLISHED")
        return {
            "status": "ok",
            "id": report_id,
            "file_path": output_path,
            "download_url": f"/api/reports/{report_id}/download",
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


# ---- 报告列表 ----

@router.get("/list")
def list_api(limit: int = 20):
    """获取报告列表"""
    reports = list_reports(limit=limit)
    return {"reports": reports, "count": len(reports)}


# ---- 报告详情 ----

@router.get("/{report_id}")
def detail(report_id: int):
    """获取报告完整数据"""
    data = get_report(report_id)
    if not data:
        raise HTTPException(404, "报告不存在")
    return data


# ---- 下载 Word ----

@router.get("/{report_id}/download")
def download(report_id: int):
    """下载 .docx 文件"""
    try:
        file_bytes = generate_report_bytes(report_id)
    except ValueError as e:
        raise HTTPException(404, str(e))

    data = get_report(report_id)
    filename = f"L2_测试报告_{data.get('file_number', str(report_id))}.docx"

    return StreamingResponse(
        io.BytesIO(file_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ---- 添加 Bug ----

@router.post("/{report_id}/bugs")
def add_bugs(report_id: int, data: list):
    """批量添加 Bug"""
    save_bugs(report_id, data)
    return {"status": "ok", "count": len(data)}


# ---- 添加测试大项 ----

@router.post("/{report_id}/items")
def add_items(report_id: int, data: list):
    """批量添加测试大项"""
    save_test_items(report_id, data)
    return {"status": "ok", "count": len(data)}


# ---- 添加专项测试 ----

@router.post("/{report_id}/sub-items")
def add_sub_items(report_id: int, data: list):
    """批量添加专项测试结果"""
    save_sub_items(report_id, data)
    return {"status": "ok", "count": len(data)}
