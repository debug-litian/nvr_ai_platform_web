"""
api/routes/verification.py — 核验 API 路由
"""

import os
import threading
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, Query
from fastapi.responses import PlainTextResponse

from config import settings
from core.ftp_monitor import FTPMonitor
from core.verification_worker import VerificationWorker
from core.ftp_test_reporter import (
    FTPTestReporter,
    export_report_csv,
    export_report_html,
)
from core.nvr_config_tester import NvrConfigTester
from utils.logger import get_logger

logger = get_logger("api.verification")

router = APIRouter(prefix="/api", tags=["verification"])

# 共享状态
_lock = threading.Lock()
_results: List[Dict[str, Any]] = []
_monitor: Optional[FTPMonitor] = None
_worker: Optional[VerificationWorker] = None
_active = False


def _on_file(record: dict):
    if _worker:
        _worker.enqueue(record)


def _on_done(result: dict):
    with _lock:
        _results.append(result)


def _on_err(fp: str, msg: str):
    with _lock:
        _results.append({"original": os.path.basename(fp) if fp else "?", "full_path": fp, "error": msg, "verification_failed": True})


def _on_status(msg: str):
    logger.info("monitor: %s", msg)


def _on_mon_err(msg: str):
    logger.error("monitor error: %s", msg)


def _on_work_status(msg: str):
    logger.info("worker: %s", msg)


@router.post("/verification/start")
def start(req: Optional[Dict[str, Any]] = None):
    global _monitor, _worker, _active
    if _active:
        return {"status": "already_running", "message": "监控已在运行"}
    watch_dir = req.get("watch_dir") if req else None

    with _lock:
        _results.clear()

    try:
        from detectors.yolo_detector import YoloDetector
        detector = YoloDetector()
    except Exception:
        detector = None

    _worker = VerificationWorker(
        detector=detector,
        profile_path=str(settings.NVR_PROFILE_PATH),
        on_verification_complete=_on_done,
        on_verification_error=_on_err,
        on_worker_status=_on_work_status,
    )
    _worker.start()

    _monitor = FTPMonitor(
        watch_dir=watch_dir or settings.FTP_UPLOAD_DIR,
        on_file_detected=_on_file,
        on_monitor_status=_on_status,
        on_monitor_error=_on_mon_err,
    )
    _monitor.start()
    _active = True
    return {"status": "started", "message": f"监控已启动: {watch_dir or settings.FTP_UPLOAD_DIR}"}


@router.post("/verification/stop")
def stop():
    global _active
    if not _active:
        return {"status": "not_running", "message": "监控未运行"}
    if _monitor:
        _monitor.stop()
    if _worker:
        _worker.stop()
    _active = False
    return {"status": "stopped", "message": "监控已停止", "total_results": len(_results)}


@router.get("/verification/results")
def results():
    with _lock:
        copy = list(_results)
    return {"status": "running" if _active else "stopped", "count": len(copy), "results": copy}


@router.get("/verification/report")
def report(format: Optional[str] = Query("json")):
    with _lock:
        copy = list(_results)
    valid = [r for r in copy if not r.get("verification_failed")]
    reporter = FTPTestReporter(total_channels=settings.NVR_TOTAL_CHANNELS)
    reporter.add_results(valid)
    rpt = reporter.generate()

    if format == "csv":
        p = str(settings.REPORT_EXPORT_DIR / "ftp_test_report.csv")
        export_report_csv(rpt, p)
        return PlainTextResponse(f"CSV 报告已导出: {p}")

    if format == "html":
        p = str(settings.REPORT_EXPORT_DIR / "ftp_test_report.html")
        export_report_html(rpt, p)
        return PlainTextResponse(f"HTML 报告已导出: {p}")

    return {
        "total_files": rpt.total_files,
        "jpg_count": rpt.jpg_count,
        "mp4_count": rpt.mp4_count,
        "channel_count": rpt.channel_count,
        "total_channels": rpt.total_channels,
        "nvr_name": rpt.nvr_name,
        "time_range_start": rpt.time_range_start.isoformat() if rpt.time_range_start else None,
        "time_range_end": rpt.time_range_end.isoformat() if rpt.time_range_end else None,
        "false_alarm_count": rpt.false_alarm_count,
        "false_alarm_rate": round(rpt.false_alarm_rate, 2),
        "yolo_match_count": rpt.yolo_match_count,
        "yolo_match_rate": round(rpt.match_rate, 2),
        "total_verifiable": rpt.total_verifiable,
        "overall_score": round(rpt.overall_score, 1),
        "channel_coverage_rate": round(rpt.channel_coverage_rate, 2),
        "alarm_type_stats": rpt.alarm_type_stats,
        "green_line_count": rpt.green_line_count,
        "schedule_pass_rate": 0.0,  # not a field on FTPTestReport
        "schedule_coverage_by_hour": rpt.schedule_coverage_by_hour,
        "channel_coverage": rpt.channel_coverage,
        "file_size_avg_mb": round(rpt.file_size_avg_mb, 2),
        "mp4_duration_avg_sec": round(rpt.mp4_duration_avg_sec, 2),
        "mp4_codecs": rpt.mp4_codecs,
        "jpg_resolutions": rpt.jpg_resolutions,
        "mp4_resolutions": rpt.mp4_resolutions,
    }


@router.get("/config-test/report")
def config_test():
    with _lock:
        copy = list(_results)
    valid = [r for r in copy if not r.get("verification_failed")]
    tester = NvrConfigTester(profile_path=str(settings.NVR_PROFILE_PATH))
    tester.load_profile(str(settings.NVR_PROFILE_PATH))
    rpt = tester.run_all_checks(valid)
    return {
        "profile_path": rpt.profile_path,
        "total_checks": rpt.total_checks,
        "passed": rpt.passed,
        "failed": rpt.failed,
        "skipped": rpt.skipped,
        "pass_rate": round(rpt.pass_rate, 2),
        "categories": rpt.categories,
        "items": [it.__dict__ if hasattr(it, "__dict__") else it for it in rpt.items],
        "generated_at": rpt.generated_at,
    }
