# NVR AI Platform — Web 测试平台

将 Reolink NVR PyQt5 桌面测试工具改造为 **FastAPI + Streamlit** Web 平台。

## 快速开始

```bash
# 1. 安装依赖
pip install -r requirements.txt

# 2. 一键启动
python run.py

# 3. 打开浏览器
# http://localhost:8501  — Streamlit 前端
# http://localhost:8000/docs — Swagger API 文档
```

## 项目结构

```
nvr-ai-platform-web/
├── config/                  # 全局配置
│   ├── settings.py          # 全局配置参数
│   └── nvr_profile.json     # NVR 预期配置 (9大类)
├── core/                    # 核心业务逻辑 (从源项目复制)
│   ├── alarm_types.py       # 报警类型 → YOLO COCO 映射
│   ├── alarm_verifier.py    # YOLO 报警核验引擎
│   ├── ftp_monitor.py       # FTP 目录监控 (watchdog + threading)
│   ├── ftp_filename_parser.py # Reolink 文件名解析
│   ├── ftp_test_reporter.py # 测试报告聚合 (CSV/HTML)
│   ├── nvr_config_tester.py # NVR 9大类配置测试
│   ├── reolink_device.py    # Reolink 设备控制封装
│   └── verification_worker.py # 核验工作线程
├── detectors/               # 检测器
│   ├── yolo_detector.py     # YOLO 目标检测
│   ├── green_line_detector.py # 绿线/花屏检测
│   └── false_positive_filter.py # 误报过滤
├── utils/                   # 工具函数
├── api/                     # FastAPI 后端
│   ├── main.py              # FastAPI 入口 (CORS + 路由)
│   ├── routes/
│   │   ├── verification.py  # 核验 API
│   │   ├── device.py        # 设备控制 API
│   │   └── monitor.py       # WebSocket 推送
│   └── models/
│       └── schemas.py       # Pydantic 数据模型
├── web/                     # Streamlit 前端
│   ├── app.py               # 主页面 (控制面板)
│   └── pages/
│       ├── 1_报警明细.py    # 核验结果表格
│       ├── 2_测试报告.py    # 聚合统计仪表盘
│       ├── 3_FTP配置测试.py # 9大类配置检查
│       ├── 4_邮件告警测试.py # 邮件测试 (占位)
│       └── 5_接口能力集测试.py # 设备控制
├── models/yolov8/           # YOLO 模型文件
├── reports/                 # 报告导出目录
├── run.py                   # 统一启动入口
├── requirements.txt         # 依赖清单
└── README.md
```

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| POST | `/api/verification/start` | 启动 FTP 监控 + 核验 |
| POST | `/api/verification/stop` | 停止监控 |
| GET | `/api/verification/results` | 获取核验结果 |
| GET | `/api/verification/report` | 生成测试报告 |
| GET | `/api/config-test/report` | 配置测试报告 |
| GET | `/api/device/info` | 设备信息 |
| GET | `/api/device/ai-states` | AI 检测状态 |
| POST | `/api/device/control` | 设备控制 |
| WS | `/ws/monitor` | WebSocket 实时推送 |

## 环境要求

- Python 3.8+ (建议 3.11+ 以获得 reolink-aio 支持)
- Windows / Linux / macOS

## 开发说明

- `core/` 目录代码从原 PyQt 项目迁移，将 `QThread` + `pyqtSignal` 改为 `threading.Thread` + 回调函数
- `reolink-aio` 需要 Python 3.11+，当前环境不可用时设备控制功能优雅降级
- 邮件告警测试功能在源项目中未实现，此版本为占位页面
