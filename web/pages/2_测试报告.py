"""
2_测试报告.py — 聚合统计仪表盘

展示 FTP 功能测试的综合报告：指标卡 + 图表 + 通道分析。
"""

import requests
import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

st.set_page_config(page_title="测试报告", page_icon="📊", layout="wide")

API_BASE = "http://127.0.0.1:8000"


def api_get(endpoint: str):
    try:
        resp = requests.get(f"{API_BASE}{endpoint}", timeout=5)
        return resp.json() if resp.status_code == 200 else None
    except Exception as e:
        st.error(f"API 连接失败: {e}")
        return None


st.title("📊 测试报告仪表盘")
st.markdown("FTP 报警核验聚合统计与分析。")

report = api_get("/api/verification/report")

if not report or report.get("total_files", 0) == 0:
    st.info("暂无报告数据。请先在主页启动 FTP 监控并完成核验。")
    st.stop()

# ═══════════════════════════════════════════════════════════
# 综合评分仪表盘
# ═══════════════════════════════════════════════════════════

st.header("🎯 综合评分")

score = report.get("overall_score", 0)
col1, col2, col3, col4, col5 = st.columns(5)

with col1:
    st.metric("综合评分", f"{score}/100",
              delta="优秀" if score >= 80 else ("良好" if score >= 60 else "待优化"))

with col2:
    st.metric("总文件数", report.get("total_files", 0),
              delta=f"JPG: {report.get('jpg_count', 0)} MP4: {report.get('mp4_count', 0)}")

with col3:
    rate = report.get("false_alarm_rate", 0)
    st.metric("误报率", f"{rate}%",
              delta="低" if rate < 10 else ("中" if rate < 30 else "高"),
              delta_color="off" if rate > 10 else "normal")

with col4:
    match_rate = report.get("yolo_match_rate", 0)
    st.metric("AI 匹配率", f"{match_rate}%",
              delta="高" if match_rate > 80 else ("中" if match_rate > 50 else "低"))

with col5:
    cov = report.get("channel_coverage_rate", 0)
    st.metric("通道覆盖", f"{cov}%")

# ═══════════════════════════════════════════════════════════
# 统计图表
# ═══════════════════════════════════════════════════════════

st.divider()

col_left, col_right = st.columns(2)

with col_left:
    st.subheader("文件类型分布")
    # 饼图
    file_labels = ["JPG", "MP4"]
    file_values = [report.get("jpg_count", 0), report.get("mp4_count", 0)]
    fig_pie = px.pie(
        names=file_labels, values=file_values,
        title="图片 vs 视频",
        color_discrete_sequence=px.colors.qualitative.Set2,
    )
    st.plotly_chart(fig_pie, use_container_width=True)

with col_right:
    st.subheader("误报分析")
    # 柱状图
    false_count = report.get("false_alarm_count", 0)
    total = report.get("total_files", 0)
    fig_bar = go.Figure(data=[
        go.Bar(name="正常", x=["核验结果"], y=[total - false_count], marker_color="#4CAF50"),
        go.Bar(name="误报", x=["核验结果"], y=[false_count], marker_color="#F44336"),
    ])
    fig_bar.update_layout(barmode="stack", title=f"误报率: {rate}%")
    st.plotly_chart(fig_bar, use_container_width=True)

# 报警类型分布
st.subheader("报警类型分布")
alarm_stats = report.get("alarm_type_stats", {})
if alarm_stats:
    df_alarm = pd.DataFrame([
        {"类型": k, "数量": v.get("count", 0) if isinstance(v, dict) else v}
        for k, v in alarm_stats.items()
    ]).sort_values("数量", ascending=False)

    fig_alarm = px.bar(
        df_alarm, x="类型", y="数量",
        title="各报警类型数量分布",
        color="类型",
        color_discrete_sequence=px.colors.qualitative.Set3,
    )
    st.plotly_chart(fig_alarm, use_container_width=True)
else:
    st.caption("暂无报警类型统计数据")

# 详细信息表
st.divider()
st.subheader("📋 详细信息")

detail_data = {
    "指标": [
        "NVR 型号", "时间范围(开始)", "时间范围(结束)",
        "可核验报警数", "绿线检测数",
        "布防计划通过率", "文件平均大小(MB)",
        "视频平均时长(秒)", "视频编码分布",
        "图片分辨率分布", "视频分辨率分布",
    ],
    "值": [
        report.get("nvr_name", "-"),
        report.get("time_range_start", "-"),
        report.get("time_range_end", "-"),
        report.get("total_verifiable", 0),
        report.get("green_line_count", 0),
        f"{report.get('schedule_pass_rate', 0)}%",
        report.get("file_size_avg_mb", 0),
        report.get("mp4_duration_avg_sec", 0),
        str(report.get("mp4_codecs", {})),
        str(report.get("jpg_resolutions", {})),
        str(report.get("mp4_resolutions", {})),
    ],
}
st.dataframe(pd.DataFrame(detail_data), use_container_width=True, hide_index=True)
