"""
5_接口能力集测试.py — NVR 设备控制 & JsonAPI 接口测试

设备信息查看 + 设备控制操作。
265 个 JsonAPI 接口的测试面板。
"""

import requests
import streamlit as st
import pandas as pd

st.set_page_config(page_title="接口能力集测试", page_icon="🔌", layout="wide")

API_BASE = "http://127.0.0.1:8000"


def api_get(endpoint: str):
    try:
        resp = requests.get(f"{API_BASE}{endpoint}", timeout=10)
        return resp.json() if resp.status_code == 200 else None
    except Exception as e:
        return {"error": str(e)}


def api_post(endpoint: str, json_data: dict = None):
    try:
        resp = requests.post(f"{API_BASE}{endpoint}", json=json_data, timeout=10)
        return resp.json()
    except Exception as e:
        return {"error": str(e)}


st.title("🔌 接口能力集测试")
st.markdown("NVR 设备连接测试 + JsonAPI 接口测试面板。")

# ═══════════════════════════════════════════════════════════
# Tab: 设备信息
# ═══════════════════════════════════════════════════════════

tab1, tab2 = st.tabs(["📡 设备控制", "🔧 JsonAPI 接口列表"])

with tab1:
    st.subheader("NVR 设备连接")

    col1, col2, col3 = st.columns(3)
    with col1:
        if st.button("🔍 获取设备信息", use_container_width=True):
            info = api_get("/api/device/info")
            if info:
                if "error" in info:
                    st.error(f"连接失败: {info['error']}")
                elif "detail" in info:
                    st.warning(f"不可用: {info['detail']}")
                else:
                    st.session_state["device_info"] = info
                    st.success("设备信息已获取")

    with col2:
        if st.button("🤖 获取 AI 状态", use_container_width=True):
            states = api_get("/api/device/ai-states")
            if states:
                if "error" in states:
                    st.error(f"获取失败: {states['error']}")
                elif "detail" in states:
                    st.warning(f"不可用: {states['detail']}")
                else:
                    st.session_state["ai_states"] = states
                    st.success("AI 状态已获取")

    with col3:
        if st.button("🔄 设备重启", use_container_width=True, type="secondary",
                     help="发送重启命令到 NVR"):
            result = api_post("/api/device/control", {"action": "reboot"})
            if result:
                st.warning(f"重启命令: {result.get('message', result)}")

    # 显示设备信息
    if "device_info" in st.session_state:
        st.divider()
        st.subheader("📋 设备信息")
        info = st.session_state["device_info"]
        cols = st.columns(4)
        cols[0].metric("连接状态", "✅ 已连接" if info.get("connected") else "❌ 未连接")
        cols[1].metric("型号", info.get("model_name", "-"))
        cols[2].metric("固件版本", info.get("firmware_version", "-"))
        cols[3].metric("通道数", info.get("num_channels", 0))

        cols2 = st.columns(4)
        cols2[0].metric("摄像头数", info.get("num_cameras", 0))
        cols2[1].metric("MAC 地址", info.get("mac_address", "-"))
        cols2[2].metric("RTSP 端口", info.get("rtsp_port", "-"))
        cols2[3].metric("ONVIF 端口", info.get("onvif_port", "-"))

    # 显示 AI 状态
    if "ai_states" in st.session_state:
        st.divider()
        st.subheader("🤖 AI 检测状态")
        ai = st.session_state["ai_states"]
        ai_list = ai.get("ai_states", [])
        if ai_list:
            ai_data = []
            for s in ai_list:
                if isinstance(s, dict):
                    ai_data.append({
                        "通道": s.get("channel", "-"),
                        "人形检测": "✅" if s.get("human_detected") else "-",
                        "车辆检测": "✅" if s.get("vehicle_detected") else "-",
                        "宠物检测": "✅" if s.get("pet_detected") else "-",
                        "移动侦测": "✅" if s.get("motion_detected") else "-",
                    })
            st.dataframe(pd.DataFrame(ai_data), use_container_width=True)
        else:
            st.info("无 AI 检测数据")

    # 红外灯控制
    st.divider()
    st.subheader("💡 设备控制")
    col_c1, col_c2, col_c3 = st.columns(3)
    channel = col_c1.number_input("通道", min_value=0, max_value=15, value=0)

    if col_c2.button("💡 IR 灯开", use_container_width=True):
        r = api_post("/api/device/control", {"action": "set_ir_lights", "channel": channel, "enabled": True})
        st.toast(f"IR 灯: {r.get('message', r)}")

    if col_c3.button("💡 IR 灯关", use_container_width=True):
        r = api_post("/api/device/control", {"action": "set_ir_lights", "channel": channel, "enabled": False})
        st.toast(f"IR 灯: {r.get('message', r)}")

# ═══════════════════════════════════════════════════════════
# Tab: JsonAPI 接口列表
# ═══════════════════════════════════════════════════════════

with tab2:
    st.subheader("JsonAPI 接口能力集")
    st.info("""
    **265 个 JsonAPI 接口，1785 个参数**

    接口能力集测试功能将在后续版本中实现，基于 reolink-aio 底层 API 遍历所有
    Reolink NVR JsonAPI 端点并验证参数读写能力。
    """)

    # 接口分类占位
    categories = [
        ("系统信息", "GetDevInfo, GetDevName, GetHddInfo, GetAbility..."),
        ("网络配置", "GetNetPort, SetNetPort, GetWifi, GetDdns..."),
        ("视频参数", "GetEnc, SetEnc, GetImage, GetOsd..."),
        ("报警设置", "GetAlarm, SetAlarm, GetMotion, GetIsp..."),
        ("录像管理", "GetRec, SetRec, GetRecV20, Search..."),
        ("用户管理", "GetUser, SetUser, GetUserInfoV20..."),
        ("PTZ 控制", "GetPtzSerial, PtzCtrl, GetPtzPreset..."),
        ("FTP/邮件", "GetFtp, SetFtp, GetEmail, SetEmail..."),
        ("AI 能力", "GetAiState, GetAiCfg, SetAiCfg..."),
        ("系统维护", "Reboot, Restore, Update, GetLog..."),
    ]

    for cat_name, cat_desc in categories:
        with st.expander(f"📂 {cat_name}"):
            st.caption(f"包含接口: {cat_desc}")

    st.metric("总接口数", "265")
    st.metric("总参数数", "1,785")
    st.caption("⚠️ 接口测试功能需要 reolink-aio 库 (Python 3.11+) — 当前环境暂不支持自动测试")
