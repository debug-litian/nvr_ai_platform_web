"""
3_FTP配置测试.py — NVR 9大类配置测试结果

基于 nvr_profile.json 的预期配置与实际报警数据进行对比校验。
"""

import requests
import streamlit as st
import pandas as pd
import plotly.express as px

st.set_page_config(page_title="FTP配置测试", page_icon="⚙️", layout="wide")

API_BASE = "http://127.0.0.1:8000"


def api_get(endpoint: str):
    try:
        resp = requests.get(f"{API_BASE}{endpoint}", timeout=5)
        return resp.json() if resp.status_code == 200 else None
    except Exception as e:
        st.error(f"API 连接失败: {e}")
        return None


st.title("⚙️ FTP 配置测试")
st.markdown("基于 `nvr_profile.json` 的 9 大类 NVR 配置合规性检查。")

config_report = api_get("/api/config-test/report")

if not config_report or config_report.get("total_checks", 0) == 0:
    st.warning("暂无配置测试数据。请先在主页完成 FTP 报警核验。")
    st.info("配置测试需要核验结果数据作为输入。")
    st.stop()

# ═══════════════════════════════════════════════════════════
# 总览卡片
# ═══════════════════════════════════════════════════════════

pass_rate = config_report.get("pass_rate", 0)

col1, col2, col3, col4 = st.columns(4)
col1.metric("检查项总数", config_report.get("total_checks", 0))
col2.metric("通过", config_report.get("passed", 0), delta="✅")
col3.metric("失败", config_report.get("failed", 0),
            delta="⚠️" if config_report.get("failed", 0) > 0 else "✅",
            delta_color="off" if config_report.get("failed", 0) == 0 else "inverse")
col4.metric("通过率", f"{pass_rate}%",
            delta="合格" if pass_rate >= 80 else "待改进",
            delta_color="off" if pass_rate >= 80 else "inverse")

# ═══════════════════════════════════════════════════════════
# 9 大类分布
# ═══════════════════════════════════════════════════════════

st.divider()
st.subheader("📊 9 大类配置测试")

categories = config_report.get("categories", {})
if categories:
    # 构建分类表
    cat_data = []
    for cat_name, cat_info in categories.items():
        if isinstance(cat_info, dict):
            cat_data.append({
                "类别": cat_name,
                "总数": cat_info.get("total", 0),
                "通过": cat_info.get("passed", 0),
                "失败": cat_info.get("failed", 0),
                "跳过": cat_info.get("skipped", 0),
                "通过率": f"{cat_info.get('pass_rate', 0):.1f}%",
            })

    if cat_data:
        df_cat = pd.DataFrame(cat_data)

        # 柱状图
        fig = px.bar(
            df_cat,
            x="类别",
            y=["通过", "失败", "跳过"],
            title="9 大类配置检查结果",
            labels={"value": "数量", "variable": "状态"},
            color_discrete_map={
                "通过": "#4CAF50",
                "失败": "#F44336",
                "跳过": "#FFC107",
            },
            barmode="stack",
        )
        st.plotly_chart(fig, use_container_width=True)

        # 表格
        st.dataframe(df_cat, use_container_width=True, hide_index=True)

# ═══════════════════════════════════════════════════════════
# 详细检查项
# ═══════════════════════════════════════════════════════════

st.divider()
st.subheader("📋 详细检查项")

items = config_report.get("items", [])
if items:
    # 构建详细表
    item_rows = []
    for item in items:
        if isinstance(item, dict):
            item_rows.append({
                "类别": item.get("category", "-"),
                "检查项": item.get("check_name", "-"),
                "通道": item.get("channel", "-"),
                "期望值": str(item.get("expected", "-")),
                "实际值": str(item.get("actual", "-")),
                "结果": "✅ 通过" if item.get("passed") else ("⚠️ 失败" if not item.get("passed") else "⏭️ 跳过"),
                "详情": item.get("detail", "-"),
            })

    if item_rows:
        st.dataframe(pd.DataFrame(item_rows), use_container_width=True)
else:
    st.info("暂无详细检查项数据。")

st.caption(f"配置文件: {config_report.get('profile_path', '-')}")
