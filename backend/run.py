"""
run.py — NVR AI Platform 后端启动脚本

用法:
    python run.py              # 生产模式 (reload=False)
    python run.py --reload     # 开发模式 (reload=True, 代码改动自动重启)
"""

import sys
import os
import uvicorn

if __name__ == "__main__":
    root = os.path.dirname(os.path.abspath(__file__))
    os.chdir(root)
    sys.path.insert(0, root)

    print("=" * 50)
    print("  NVR AI Platform — Backend API")
    print("  http://127.0.0.1:8000")
    print("  http://127.0.0.1:8000/docs")
    print("=" * 50)

    # 如果是开发模式（带 --reload 参数），用 reload=True + watchfiles
    # 生产部署用 reload=False 或去掉 --reload 参数
    dev_mode = "--reload" in sys.argv or "-r" in sys.argv
    reload = dev_mode

    uvicorn.run(
        "api.main:app",
        host="127.0.0.1",
        port=8000,
        reload=reload,
        reload_dirs=[str(root)] if reload else None,
        log_level="info",
    )
