#!/usr/bin/env python3
"""
run.py — NVR AI Platform 统一启动入口

同时启动 FastAPI 后端 (端口 8000) 和 Streamlit 前端 (端口 8501)。

用法:
    python run.py              # 正常启动
    python run.py --no-browser  # 不自动打开浏览器
"""

import sys
import os
import subprocess
import time
import threading
import webbrowser


def run_fastapi():
    """在 daemon 线程中启动 FastAPI 服务器"""
    import uvicorn
    uvicorn.run(
        "api.main:app",
        host="127.0.0.1",
        port=8000,
        reload=False,
        log_level="warning",
    )


def run_streamlit():
    """在子进程中启动 Streamlit 服务器"""
    root = os.path.dirname(os.path.abspath(__file__))
    app_path = os.path.join(root, "web", "app.py")
    return subprocess.Popen([
        sys.executable, "-m", "streamlit", "run",
        app_path,
        "--server.port", "8501",
        "--server.address", "0.0.0.0",
        "--server.headless", "true",
        "--browser.gatherUsageStats", "false",
        "--logger.level", "warning",
    ])


def main():
    no_browser = "--no-browser" in sys.argv

    # 确保在项目根目录运行
    root = os.path.dirname(os.path.abspath(__file__))
    os.chdir(root)

    print("=" * 55)
    print("  NVR AI Platform — Web Edition  v1.0.0")
    print("=" * 55)
    print(f"  FastAPI 后端:  http://127.0.0.1:8000")
    print(f"  Streamlit 前端: http://127.0.0.1:8501")
    print(f"  Swagger 文档:  http://127.0.0.1:8000/docs")
    print("=" * 55)

    # 启动 FastAPI（daemon 线程）
    print("[1/2] 启动 FastAPI 后端...")
    api_thread = threading.Thread(target=run_fastapi, daemon=True)
    api_thread.start()
    time.sleep(2)
    print("      ✅ FastAPI 已启动")

    # 启动 Streamlit（子进程）
    print("[2/2] 启动 Streamlit 前端...")
    streamlit_proc = run_streamlit()
    time.sleep(3)
    print("      ✅ Streamlit 已启动")
    print("=" * 55)

    # 自动打开浏览器
    if not no_browser:
        try:
            webbrowser.open("http://127.0.0.1:8501")
            print("  🌐 浏览器已打开")
        except Exception:
            print("  ⚠️ 无法自动打开浏览器，请手动访问 http://127.0.0.1:8501")
    else:
        print("  📌 浏览器访问: http://127.0.0.1:8501")

    print("=" * 55)
    print("  按 Ctrl+C 停止服务")
    print()

    # 等待 Streamlit 进程退出
    try:
        streamlit_proc.wait()
    except KeyboardInterrupt:
        print("\n⏹️ 正在关闭服务...")
        streamlit_proc.terminate()
        try:
            streamlit_proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            streamlit_proc.kill()
        print("✅ 服务已关闭")
        sys.exit(0)


if __name__ == "__main__":
    main()
