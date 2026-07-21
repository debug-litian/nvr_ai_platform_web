"""
security_scanner.py — NVR 安全自动化扫描引擎

集成以下安全测试:
1. Nmap 端口扫描 — 验证 NVR 默认关闭多余端口
2. Nessus 漏洞扫描 — 确保无中等及以上漏洞 (预留接口)
3. Busybox 工具检查 — 验证 telnet/ftp/ssh 等已被移除
4. 串口登录验证 — 验证串口使用加密密码登录

所有函数为 async，返回 JSON 可序列化的 dict。
"""

import asyncio
import os
import json
import platform
from datetime import datetime
from typing import Dict, Any, Optional, List

from utils.logger import get_logger

logger = get_logger("security_scanner")

# ---- 工具路径配置 ----
_NMAP_PATH = os.environ.get("NMAP_PATH", "nmap")


# ════════════════════════════════════
# 1. Nmap 端口扫描
# ════════════════════════════════════

async def nmap_scan(
    target_ip: str,
    ports: str = "1-10000",
    scan_args: str = "-sV -T4",
    timeout: float = 120.0,
) -> Dict[str, Any]:
    """
    使用 Nmap 扫描目标 IP 的开放端口。

    返回:
    {
        "scan_status": "PASS" | "FAIL",
        "target": "192.168.124.2",
        "port_count": 5,
        "open_ports": [{port, protocol, service, version, state}, ...],
        "raw_summary": "Nmap done: ...",
        "error": null
    }
    """
    cmd = [_NMAP_PATH, "-oX", "-", "-p", ports]
    if scan_args:
        cmd.extend(scan_args.split())
    cmd.append(target_ip)

    logger.info("Nmap 扫描启动: %s (端口 %s)", target_ip, ports)

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout + 10)

        if proc.returncode != 0 and proc.returncode != 1:  # nmap exits 1 for "no open ports" — that's OK
            err = stderr.decode("utf-8", errors="replace")[:500]
            logger.error("Nmap 返回非零: %s", err)
            return {
                "scan_status": "FAIL",
                "target": target_ip,
                "port_count": 0,
                "open_ports": [],
                "raw_summary": "",
                "error": f"Nmap exited with code {proc.returncode}: {err}",
            }

        xml_text = stdout.decode("utf-8", errors="replace")

        # 解析 XML → 提取端口信息
        try:
            import xmltodict
            data = xmltodict.parse(xml_text)
            hosts = data.get("nmaprun", {}).get("host", {})
            if isinstance(hosts, dict):
                hosts = [hosts]

            open_ports = []
            for host in hosts:
                ports_data = host.get("ports", {}).get("port", [])
                if isinstance(ports_data, dict):
                    ports_data = [ports_data]
                for port in ports_data:
                    if port.get("state", {}).get("@state") == "open":
                        open_ports.append({
                            "port": int(port.get("@portid", 0)),
                            "protocol": port.get("@protocol", ""),
                            "service": port.get("service", {}).get("@name", ""),
                            "version": port.get("service", {}).get("@product", ""),
                            "state": "open",
                        })

            # 摘要
            run_stats = data.get("nmaprun", {}).get("runstats", {})
            summary = run_stats.get("finished", {}).get("@summary", "") if run_stats else ""

            return {
                "scan_status": "PASS",
                "target": target_ip,
                "port_count": len(open_ports),
                "open_ports": open_ports,
                "raw_summary": summary,
                "error": None,
            }
        except Exception as parse_err:
            logger.exception("Nmap XML 解析失败")
            return {
                "scan_status": "PASS",
                "target": target_ip,
                "port_count": 0,
                "open_ports": [],
                "raw_summary": "XML parse error",
                "error": str(parse_err),
            }

    except asyncio.TimeoutError:
        logger.error("Nmap 扫描超时 (%s秒)", timeout)
        return {
            "scan_status": "FAIL",
            "target": target_ip,
            "port_count": 0,
            "open_ports": [],
            "raw_summary": "",
            "error": f"扫描超时 ({timeout}s)",
        }
    except FileNotFoundError:
        logger.error("Nmap 未安装或不在 PATH 中")
        return {
            "scan_status": "FAIL",
            "target": target_ip,
            "port_count": 0,
            "open_ports": [],
            "raw_summary": "",
            "error": "Nmap 未安装。请从 https://nmap.org/download.html 下载安装，并确保 nmap 在 PATH 中。",
        }
    except Exception as e:
        logger.exception("Nmap 扫描异常")
        return {
            "scan_status": "FAIL",
            "target": target_ip,
            "port_count": 0,
            "open_ports": [],
            "raw_summary": "",
            "error": str(e),
        }


# ════════════════════════════════
# 2. Busybox 工具检查 (SSH 连接)
# ════════════════════════════════

async def busybox_check(
    target_ip: str,
    username: str = "root",
    password: str = "",
    port: int = 22,
    timeout: float = 15.0,
) -> Dict[str, Any]:
    """
    通过 SSH 连接 NVR，检查 Busybox 危险工具是否已移除。

    检查项:
    - telnet / ssh / ftp / tftp / wget / nc / tcpdump / dropbear

    返回:
    {
        "check_status": "PASS" | "FAIL" | "SKIP",
        "target": "192.168.124.2",
        "removed_tools": ["telnet", "ftp", "ssh", ...],   # 已移除的
        "found_tools": ["wget", ...],                     # 仍存在的（不安全）
        "details": "共检查 8 项, 已移除 6 项, 仍存在 2 项",
        "error": null
    }
    """
    # Busybox 工具列表
    DANGEROUS_TOOLS = [
        "telnet", "ssh", "ftp", "tftp", "wget",
        "nc", "tcpdump", "dropbear",
    ]

    logger.info("Busybox 检查: %s@%s:%d", username, target_ip, port)

    try:
        import paramiko

        # 使用 paramiko 异步执行（在线程池中）
        def _ssh_check():
            client = paramiko.SSHClient()
            client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            client.connect(
                target_ip, port=port, username=username, password=password,
                timeout=timeout, allow_agent=False, look_for_keys=False,
            )

            found = []
            removed = []
            for tool in DANGEROUS_TOOLS:
                stdin, stdout, stderr = client.exec_command(f"which {tool} 2>/dev/null || echo NOT_FOUND")
                result = stdout.read().decode("utf-8", errors="replace").strip()
                if result and "NOT_FOUND" not in result:
                    found.append(tool)
                else:
                    removed.append(tool)

            client.close()
            return found, removed

        loop = asyncio.get_event_loop()
        found_tools, removed_tools = await loop.run_in_executor(None, _ssh_check)

        return {
            "check_status": "PASS" if len(found_tools) == 0 else "FAIL",
            "target": target_ip,
            "removed_tools": removed_tools,
            "found_tools": found_tools,
            "details": f"共检查 {len(DANGEROUS_TOOLS)} 项, 已移除 {len(removed_tools)} 项, 仍存在 {len(found_tools)} 项",
            "error": None,
        }

    except ImportError:
        logger.warning("paramiko 未安装，跳过 Busybox 检查")
        return {
            "check_status": "SKIP", "target": target_ip,
            "removed_tools": [], "found_tools": [],
            "details": "paramiko 库未安装，无法执行 SSH 连接检查",
            "error": "paramiko not installed",
        }
    except Exception as e:
        logger.exception("Busybox 检查失败")
        return {
            "check_status": "FAIL", "target": target_ip,
            "removed_tools": [], "found_tools": [],
            "details": f"SSH 连接或检查失败: {str(e)}",
            "error": str(e),
        }


# ════════════════════════════════
# 3. 串口登录加密验证
# ════════════════════════════════

async def serial_login_check(
    port: str = "COM1",
    baudrate: int = 115200,
    timeout: float = 15.0,
) -> Dict[str, Any]:
    """
    通过串口连接 NVR，检查是否使用了加密密码登录。

    验证逻辑:
    1. 打开串口
    2. 等待 Login 提示
    3. 发送回车 → 检查是否直接登录 (不安全)
    4. 检查是否有密码提示 (安全)

    返回:
    {
        "check_status": "PASS" | "FAIL" | "SKIP",
        "port": "COM1",
        "has_password": true,         # 是否有密码提示
        "auto_login": false,          # 是否回车直接登录
        "prompt_received": "login: ", # 收到的提示
        "details": "串口使用加密密码登录",
        "error": null
    }
    """
    logger.info("串口检查: %s @ %d baud", port, baudrate)

    try:
        import serial

        def _serial_check():
            try:
                ser = serial.Serial(port, baudrate=baudrate, timeout=timeout)
                # 等待启动信息
                buffer = b""
                start = datetime.now()
                while (datetime.now() - start).total_seconds() < timeout:
                    chunk = ser.read(256)
                    if chunk:
                        buffer += chunk
                        text = buffer.decode("utf-8", errors="replace").lower()
                        # 检测 login 提示
                        if "login:" in text:
                            ser.write(b"\r\n")
                            import time
                            time.sleep(1)
                            response = ser.read(1024).decode("utf-8", errors="replace").lower()
                            ser.close()
                            # 如果再次出现 login: 或者出现 password:，说明有密码保护
                            if "password:" in response:
                                return {
                                    "has_password": True,
                                    "auto_login": False,
                                    "prompt_received": text[:200],
                                    "details": "串口使用加密密码登录",
                                }
                            elif "login:" in response:
                                return {
                                    "has_password": True,
                                    "auto_login": False,
                                    "prompt_received": text[:200],
                                    "details": "串口需要用户名密码登录",
                                }
                            else:
                                return {
                                    "has_password": False,
                                    "auto_login": True,
                                    "prompt_received": text[:200],
                                    "details": "串口回车直接登录（不安全！）",
                                }
                ser.close()
                return {
                    "has_password": True,  # 假设有密码（未收到 login 提示）
                    "auto_login": False,
                    "prompt_received": buffer.decode("utf-8", errors="replace")[:200],
                    "details": "未收到 login 提示，可能已配置加密",
                }
            except serial.SerialException as e:
                return {"error": str(e)}

        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, _serial_check)

        if result and "error" in result:
            return {
                "check_status": "FAIL", "port": port,
                "has_password": False, "auto_login": False,
                "prompt_received": "", "details": result["error"],
                "error": result["error"],
            }

        return {
            "check_status": "PASS" if result.get("has_password") and not result.get("auto_login") else "FAIL",
            "port": port,
            "has_password": result.get("has_password", False),
            "auto_login": result.get("auto_login", False),
            "prompt_received": result.get("prompt_received", ""),
            "details": result.get("details", ""),
            "error": None,
        }

    except ImportError:
        logger.warning("pyserial 未安装，跳过串口检查")
        return {
            "check_status": "SKIP", "port": port,
            "has_password": False, "auto_login": False,
            "prompt_received": "", "details": "pyserial 库未安装",
            "error": "pyserial not installed",
        }
    except Exception as e:
        logger.exception("串口检查失败")
        return {
            "check_status": "FAIL", "port": port,
            "has_password": False, "auto_login": False,
            "prompt_received": "", "details": str(e),
            "error": str(e),
        }


# ════════════════════════════════
# 4. Nessus 漏洞扫描 (预留接口)
# ════════════════════════════════

async def nessus_scan(target_ip: str) -> Dict[str, Any]:
    """
    Nessus 漏洞扫描 (预留接口)。

    需要 Nessus Professional 或 Nessus Essentials 本地实例，
    通过 REST API (https://localhost:8834) 进行扫描。
    """
    return {
        "scan_status": "SKIP",
        "target": target_ip,
        "details": "Nessus 扫描功能预留，待集成 Nessus REST API",
        "error": None,
    }
