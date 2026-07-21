#!/bin/bash
# start.sh — NVR AI Platform 一键启动脚本 (Linux/macOS)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

echo "=================================================="
echo "  NVR AI Platform — Web Edition"
echo "=================================================="

# 1. 启动后端
echo "[1/2] 启动 FastAPI 后端..."
cd "$BACKEND_DIR"
python3 run.py --reload &
BACKEND_PID=$!
sleep 2
echo "      FastAPI 已启动: http://127.0.0.1:8000"

# 2. 启动前端
echo "[2/2] 启动 React 前端..."
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!
sleep 3
echo "      React 已启动: http://localhost:5173"

echo "=================================================="
echo "  后端 API:  http://127.0.0.1:8000/docs"
echo "  前端界面:  http://localhost:5173"
echo "  按 Ctrl+C 停止"
echo "=================================================="

# 捕获退出信号
trap "echo '正在停止...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM

wait
