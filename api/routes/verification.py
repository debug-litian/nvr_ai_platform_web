"""
api/routes/verification.py — FTP 报警核验 API 路由

端点:
- POST /api/verification/start   — 启动 FTP 监控 + 核验
- POST /api/verification/stop    — 停止监控
- GET  /api/verification/results — 获取核验结果列表
- GET  /api/verification/report  — 生成聚合报告
- GET  /api/config-test/report   — NVR 配置测试报告
"""

import os
import threading
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, Query
from fastapi.responses import PlainTextResponse

from config import settings
from core.alarm_verifier import AlarmVerifier
from core.ftp_monitor import FTPMonitor
from core.verification_worker import VerificationWorker
from core.ftp_test_reporter import (
    FTPTestReporter,
    FTPTestReport,
    export_report_csv,
    export_report_html,
)
from core.nvr_config_tester import NvrConfigTester
from utils.logger import get_logger

logger = get_logger("api.verification")

router = APIRouter(prefix="/api", tags=["verification"])

# ═══════════════════════════════════════════════════════════
# 共享状态（模块级，受锁保护）
# ═══════════════════════════════════════════════════════════

_verification_lock = threading.Lock()
_verification_results: List[Dict[str, Any]] = []
_ftp_monitor: Optional[FTPMonitor] = None
_verification_worker: Optional[VerificationWorker] = None
_monitoring_active = False


# ── 回调函数 ──────────────────────────────────────────

def _on_file_detected(record: dict):
    """FTP 新文件回调 → 入队核验"""
    if _verification_worker:
        _verification_worker.enqueue(record)


def _on_verification_complete(result: dict):
    """核验完成回调 → 存入结果列表"""
    with _verification_lock:
        _verification_results.append(result)
    logger.info("核验完成: %s", result.get("original", "?"))


def _on_verification_error(filepath: str, error_msg: str):
    """核验错误回调"""
    logger.error("核验错误: %s — %s", filepath, error_msg)
    with _verification_lock:
        _verification_results.append({
            "original": os.path.basename(filepath) if filepath else "?",
            "full_path": filepath,
            "error": error_msg,
            "verification_failed": True,
        })


def _on_monitor_status(status: str):
    logger.info("FTP 监控: %s", status)


def _on_monitor_error(error: str):
    logger.error("FTP 监控错误: %s", error)


def _on_worker_status(status: str):
    logger.info("核验引擎: %s", status)


# ═══════════════════════════════════════════════════════════
# API 端点
# ═══════════════════════════════════════════════════════════

@router.post("/verification/start")
def verification_start(req: Optional[Dict[str, Any]] = None):
    """启动 FTP 监控 + 核验引擎"""
    global _ftp_monitor, _verification_worker, _monitoring_active

    if _monitoring_active:
        return {"status": "already_running", "message": "监控已在运行中"}

    watch_dir = req.get("watch_dir") if req else None

    # 清除旧结果
    with _verification_lock:
        _verification_results.clear()

    # YOLO 检测器（延迟导入，避免未安装时崩溃）
    try:
        from detectors.yolo_detector import YoloDetector
        detector = YoloDetector()
        logger.info("YOLO 检测器已加载")
    except ImportError as e:
        logger.warning("YOLO 检测器不可用: %s", e)
        detector = None

    # 启动核验工作线程
    _verification_worker = VerificationWorker(
        detector=detector,
        profile_path=str(settings.NVR_PROFILE_PATH),
        on_verification_complete=_on_verification_complete,
        on_verification_error=_on_verification_error,
        on_worker_status=_on_worker_status,
    )
    _verification_worker.start()

    # 启动 FTP 监控线程
    _ftp_monitor = FTPMonitor(
        watch_dir=watch_dir or settings.FTP_UPLOAD_DIR,
        on_file_detected=_on_file_detected,
        on_monitor_status=_on_monitor_status,
        on_monitor_error=_on_monitor_error,
    )
    _ftp_monitor.start()
    _monitoring_active = True

    return {
        "status": "started",
        "message": f"FTP 监控已启动，目录: {watch_dir or settings.FTP_UPLOAD_DIR}",
    }


@router.post("/verification/stop")
def verification_stop():
    """停止 FTP 监控 + 核验引擎"""
    global _ftp_monitor, _verification_worker, _monitoring_active

    if not _monitoring_active:
        return {"status": "not_running", "message": "监控未运行"}

    # 先停监控（不再接收新文件）
    if _ftp_monitor:
        _ftp_monitor.stop()

    # 再停核验引擎（等待当前任务完成）
    if _verification_worker:
        _verification_worker.stop()

    _monitoring_active = False

    return {
        "status": "stopped",
        "message": "监控已停止",
        "total_results": len(_verification_results),
    }


@router.get("/verification/results")
def verification_results():
    """获取所有核验结果"""
    with _verification_lock:
        results_copy = list(_verification_results)

    return {
        "status": "running" if _monitoring_active else "stopped",
        "count": len(results_copy),
        "results": results_copy,
    }


@router.get("/verification/report")
def verification_report(
    format: Optional[str] = Query("json", description="输出格式: json / csv / html"),
):
    """生成 FTP 功能测试聚合报告"""
    with _verification_lock:
        results_copy = list(_verification_results)

    # 过滤掉核验失败的记录
    valid_results = [r for r in results_copy if not r.get("verification_failed")]

    reporter = FTPTestReporter(total_channels=settings.NVR_TOTAL_CHANNELS)
    reporter.add_results(valid_results)
    report = reporter.generate()

    if format == "csv":
        csv_path = str(settings.REPORT_EXPORT_DIR / "ftp_test_report.csv")
        export_report_csv(report, csv_path)
        return PlainTextResponse(
            content=f"CSV 报告已导出到: {csv_path}",
            status_code=200,
        )

    if format == "html":
        html_path = str(settings.REPORT_EXPORT_DIR / "ftp_test_report.html")
        export_report_html(report, html_path)
        return PlainTextResponse(
            content=f"HTML 报告已导出到: {html_path}",
            status_code=200,
        )

    # 默认返回 JSON 报告
    return {
        "total_files": report.total_files,
        "jpg_count": report.jpg_count,
        "mp4_count": report.mp4_count,
        "channel_count": report.channel_count,
        "total_channels": report.total_channels,
        "nvr_name": report.nvr_name,
        "time_range_start": report.time_range_start.isoformat() if report.time_range_start else None,
        "time_range_end": report.time_range_end.isoformat() if report.time_range_end else None,
        "false_alarm_count": report.false_alarm_count,
        "false_alarm_rate": round(report.false_alarm_rate, 2),
        "yolo_match_count": report.yolo_match_count,
        "yolo_match_rate": round(report.yolo_match_rate, 2),
        "total_verifiable": report.total_verifiable,
        "overall_score": round(report.overall_score, 1),
        "channel_coverage_rate": round(report.channel_coverage_rate, 2),
        "alarm_type_stats": report.alarm_type_stats,
        "green_line_count": report.green_line_count,
        "schedule_pass_rate": round(report.schedule_pass_rate, 2),
        "file_size_avg_mb": round(report.file_size_avg_mb, 2),
        "mp4_duration_avg_sec": round(report.mp4_duration_avg_sec, 2),
        "mp4_codecs": report.mp4_codecs,
        "jpg_resolutions": report.jpg_resolutions,
        "mp4_resolutions": report.mp4_resolutions,
    }


@router.get("/config-test/report")
def config_test_report():
    """运行 NVR 配置测试（9 大类）"""
    with _verification_lock:
        results_copy = list(_verification_results)

    valid_results = [r for r in results_copy if not r.get("verification_failed")]

    tester = NvrConfigTester(profile_path=str(settings.NVR_PROFILE_PATH))
    tester.load_profile(str(settings.NVR_PROFILE_PATH))
    report = tester.run_all_checks(valid_results)

    return {
        "profile_path": report.profile_path,
        "total_checks": report.total_checks,
        "passed": report.passed,
        "failed": report.failed,
        "skipped": report.skipped,
        "pass_rate": round(report.pass_rate, 2),
        "categories": report.categories,
        "items": [item.__dict__ if hasattr(item, '__dict__') else item for item in report.items],
        "generated_at": report.generated_at,
    }
