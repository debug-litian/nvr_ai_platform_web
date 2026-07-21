"""
1_报警明细.py — 报警核验结果明细表格

逐条展示 FTP 报警文件的核验结果，支持筛选和排序。
"""

import requests
import streamlit as st
import pandas as pd

st.set_page_config(page_title="报警明细", page_icon="📋", layout="wide")

API_BASE = "http://127.0.0.1:8000"


def api_get(endpoint: str):
    try:
        resp = requests.get(f"{API_BASE}{endpoint}", timeout=5)
        return resp.json() if resp.status_code == 200 else None
    except Exception as e:
        st.error(f"API 连接失败: {e}")
        return None


st.title("📋 报警核验明细")
st.markdown("展示逐条 FTP 报警文件的 YOLO 核验、绿线检测、配置检查结果。")

# 获取数据
results_data = api_get("/api/verification/results")

if not results_data or not results_data.get("results"):
    st.info("暂无核验结果。请在主页启动 FTP 监控。")
    st.stop()

results = results_data["results"]

# 筛选条件
st.subheader(f"共 {len(results)} 条记录")

col1, col2, col3 = st.columns(3)
with col1:
    show_type = st.multiselect(
        "报警类型筛选",
        options=sorted(set(r.get("nvr_alarm_type", r.get("alarm_type", "?")) for r in results)),
        default=[],
    )
with col2:
    show_false = st.selectbox("误报状态", ["全部", "误报", "正常", "不可核验"])
with col3:
    show_green = st.selectbox("绿线状态", ["全部", "有绿线", "无绿线"])

# 构建表格
rows = []
for r in results:
    # 类型筛选
    alarm_type = r.get("nvr_alarm_type", r.get("alarm_type", "?"))
    if show_type and alarm_type not in show_type:
        continue

    # 误报筛选
    if r.get("verification_failed"):
        false_status = "不可核验"
    else:
        false_status = "误报" if r.get("is_false_alarm") else "正常"
    if show_false != "全部" and show_false != false_status:
        continue

    # 绿线筛选
    green_status = "有绿线" if r.get("green_line_detected") else "无绿线"
    if show_green != "全部" and show_green != green_status:
        continue

    # 确定行颜色
    if r.get("verification_failed"):
        row_color = "⚫"
    elif r.get("is_false_alarm"):
        row_color = "🔴"
    elif r.get("green_line_detected"):
        row_color = "🟡"
    else:
        row_color = "🟢"

    rows.append({
        "状态": row_color,
        "时间": r.get("alarm_timestamp", "-"),
        "通道": r.get("channel", "-"),
        "文件名": r.get("original", "-"),
        "类型": alarm_type,
        "文件": r.get("file_type", "-"),
        "AI匹配": "✅" if r.get("yolo_match") else ("⚠️" if r.get("verification_failed") else "❌"),
        "最高置信度": f"{r.get('yolo_max_confidence', 0):.2%}" if r.get("yolo_max_confidence") else "-",
        "检测类别": str(r.get("yolo_classes_found", [])) if r.get("yolo_classes_found") else "-",
        "误报": "⚠️ 是" if r.get("is_false_alarm") else ("-" if r.get("verification_failed") else "✅ 否"),
        "绿线": "⚠️ 有" if r.get("green_line_detected") else "✅ 无",
        "绿线比": f"{r.get('green_line_percentage', 0):.1%}" if r.get("green_line_percentage") else "-",
        "配置项": f"通过 {r.get('config_checks_passed', 0)}/{r.get('config_checks_total', 0)}" if r.get("config_checks_total") else "-",
        "图片分辨率": r.get("image_resolution", "-"),
        "视频分辨率": r.get("video_resolution", "-"),
        "时长(秒)": f"{r.get('video_duration_sec', 0):.1f}" if r.get("video_duration_sec") else "-",
        "大小(MB)": f"{r.get('file_size_mb', 0):.2f}" if r.get("file_size_mb") else "-",
    })

st.dataframe(rows, use_container_width=True, height=600)
st.caption(f"🔴 误报 | 🟢 正常 | 🟡 绿线/花屏 | ⚫ 核验失败")
