"""
web/app.py — NVR AI Platform Streamlit 主界面

控制面板 + 多 Tab 导航
"""

import time
import requests
import streamlit as st

# ═══════════════════════════════════════════════════════════
# 页面配置
# ═══════════════════════════════════════════════════════════

st.set_page_config(
    page_title="NVR AI Platform",
    page_icon="📹",
    layout="wide",
    initial_sidebar_state="expanded",
)

API_BASE = "http://127.0.0.1:8000"


# ═══════════════════════════════════════════════════════════
# 工具函数
# ═══════════════════════════════════════════════════════════

def api_get(endpoint: str):
    """调用 GET API"""
    try:
        resp = requests.get(f"{API_BASE}{endpoint}", timeout=5)
        return resp.json() if resp.status_code == 200 else None
    except Exception as e:
        st.error(f"API 连接失败: {e}")
        return None


def api_post(endpoint: str, json_data: dict = None):
    """调用 POST API"""
    try:
        resp = requests.post(f"{API_BASE}{endpoint}", json=json_data, timeout=5)
        return resp.json() if resp.status_code == 200 else resp.json()
    except Exception as e:
        st.error(f"API 连接失败: {e}")
        return None


# ═══════════════════════════════════════════════════════════
# 主标题
# ═══════════════════════════════════════════════════════════

st.title("📹 NVR AI 测试平台")
st.markdown("Reolink NVR FTP 报警核验 & 配置测试 — Web 版")
st.divider()

# ═══════════════════════════════════════════════════════════
# 侧边栏 — 控制面板
# ═══════════════════════════════════════════════════════════

with st.sidebar:
    st.header("⚙️ 控制面板")

    # 后端状态
    health = api_get("/api/health")
    if health:
        st.success("🟢 后端已连接")
    else:
        st.error("🔴 后端未连接 — 请先启动 FastAPI")
        st.stop()

    st.divider()

    # FTP 监控控制
    st.subheader("📂 FTP 监控")
    watch_dir = st.text_input("监控目录", value="D:\\FTP_Upload")
    col1, col2 = st.columns(2)

    with col1:
        if st.button("▶️ 启动监控", use_container_width=True):
            result = api_post("/api/verification/start", {"watch_dir": watch_dir})
            if result:
                st.toast(f"启动结果: {result.get('message', result.get('status', ''))}")

    with col2:
        if st.button("⏹️ 停止监控", use_container_width=True):
            result = api_post("/api/verification/stop")
            if result:
                st.toast(f"停止结果: {result.get('message', result.get('status', ''))}")

    # 实时状态
    results_data = api_get("/api/verification/results")
    status_str = results_data.get("status", "idle") if results_data else "idle"
    count = results_data.get("count", 0) if results_data else 0

    if status_str == "running":
        st.success("🔵 监控运行中")
    elif status_str == "stopped":
        st.warning("⭕ 监控已停止")
    else:
        st.info("⚪ 空闲")

    st.metric("核验结果数", count)

    st.divider()

    # 导航指引
    st.subheader("📋 页面导航")
    st.markdown("""
    - **报警明细** — 查看逐条核验结果
    - **测试报告** — 聚合统计仪表盘
    - **FTP配置测试** — 9大类配置检查
    - **邮件告警测试** — 邮件测试 (即将推出)
    - **接口能力集测试** — 设备控制 & API 测试
    """)

    st.divider()
    st.caption("NVR AI Platform v1.0.0")


# ═══════════════════════════════════════════════════════════
# 主区域 — 实时概览
# ═══════════════════════════════════════════════════════════

st.header("📊 实时概览")

# 最近结果预览
if results_data and results_data.get("results"):
    results = results_data["results"][-10:]  # 最近 10 条
    st.subheader(f"最近核验结果 (共 {count} 条)")

    # 构建表格数据
    table_data = []
    for r in reversed(results):
        table_data.append({
            "时间": r.get("alarm_timestamp", "-"),
            "通道": r.get("channel", "-"),
            "文件名": r.get("original", "-"),
            "类型": r.get("nvr_alarm_type", r.get("alarm_type", "-")),
            "AI匹配": "✅" if r.get("yolo_match") else ("-" if r.get("verification_failed") else "❌"),
            "置信度": f"{r.get('yolo_max_confidence', 0):.2f}" if r.get("yolo_max_confidence") else "-",
            "误报": "⚠️" if r.get("is_false_alarm") else "✅",
            "绿线": "🟡" if r.get("green_line_detected") else "-",
        })

    st.dataframe(table_data, use_container_width=True)
else:
    st.info("暂无核验结果。请在侧边栏启动 FTP 监控，或将测试文件放入监控目录。")

# 报告概要
st.divider()
st.subheader("📈 报告概要")

report = api_get("/api/verification/report")
if report and report.get("total_files", 0) > 0:
    col1, col2, col3, col4 = st.columns(4)
    col1.metric("总文件数", report.get("total_files", 0))
    col2.metric("误报率", f"{report.get('false_alarm_rate', 0)}%")
    col3.metric("AI 匹配率", f"{report.get('yolo_match_rate', 0)}%")
    col4.metric("综合评分", f"{report.get('overall_score', 0)}/100")

    col1, col2, col3 = st.columns(3)
    col1.metric("通道覆盖", f"{report.get('channel_coverage_rate', 0)}%")
    col2.metric("布防通过率", f"{report.get('schedule_pass_rate', 0)}%")
    col3.metric("NVR 型号", report.get("nvr_name", "-"))
else:
    st.caption("暂无报告数据，待核验完成后自动生成。")

# 配置测试概要
config_report = api_get("/api/config-test/report")
if config_report and config_report.get("total_checks", 0) > 0:
    st.divider()
    st.subheader("🔧 配置测试")
    col1, col2, col3, col4 = st.columns(4)
    col1.metric("总检查项", config_report.get("total_checks", 0))
    col2.metric("通过", config_report.get("passed", 0))
    col3.metric("失败", config_report.get("failed", 0))
    col4.metric("通过率", f"{config_report.get('pass_rate', 0)}%")
