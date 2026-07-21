import React, { useEffect, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Typography, Badge, Button, theme } from 'antd';
import type { MenuProps } from 'antd';
import {
  HomeOutlined,
  CloudServerOutlined,
  DashboardOutlined,
  ToolOutlined,
  FileTextOutlined,
  DatabaseOutlined,
  BarChartOutlined,
  RocketOutlined,
  SettingOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  PlayCircleOutlined,
  ControlOutlined,
  FileSearchOutlined,
  HeatMapOutlined,
  SwapOutlined,
  CloudUploadOutlined,
  SecurityScanOutlined,
  SunOutlined,
  MoonOutlined,
} from '@ant-design/icons';
import { healthCheck } from '../services/device';
import { useAppStore } from '../store/useAppStore';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

// ---- 首页菜单 ----
const homeMenuItems: MenuProps['items'] = [
  { key: '/home/dashboard', icon: <DashboardOutlined />, label: '项目概况' },
  { key: '/home/test-tools', icon: <ToolOutlined />, label: '测试工具' },
  {
    key: 'testcase',
    icon: <FileTextOutlined />,
    label: '测试用例管理',
    children: [
      { key: '/home/testcase/list', label: '测试用例' },
      { key: '/home/testcase/suites', label: '测试套件' },
      { key: '/home/testcase/tasks', label: '定时任务' },
    ],
  },
  {
    key: 'testdata',
    icon: <DatabaseOutlined />,
    label: '测试数据管理',
    children: [
      { key: '/home/testdata/general', label: 'General_Setting' },
      { key: '/home/testdata/steps', label: '公共步骤' },
      { key: '/home/testdata/templates', label: '脚本模板' },
      { key: '/home/testdata/params', label: '全局参数' },
    ],
  },
  {
    key: 'result',
    icon: <BarChartOutlined />,
    label: '测试结果分析',
    children: [
      { key: '/home/result/overview', label: '测试结果' },
    ],
  },
  {
    key: 'ci',
    icon: <RocketOutlined />,
    label: '持续集成设置',
    children: [
      { key: '/home/ci/packages', label: '安装包管理' },
      { key: '/home/ci/crash', label: '崩溃上报' },
    ],
  },
  {
    key: 'settings',
    icon: <SettingOutlined />,
    label: '项目相关设置',
    children: [
      { key: '/home/settings/modules', label: '模块管理' },
      { key: '/home/settings/versions', label: '版本迭代' },
      { key: '/home/settings/version-overview', label: '版本测试情况概览' },
      { key: '/home/settings/project', label: '项目设置' },
      { key: '/home/settings/bot', label: '通知机器人' },
    ],
  },
];

// ---- 设备中心菜单 ----
const deviceMenuItems: MenuProps['items'] = [
  { key: '/device/dashboard', icon: <DashboardOutlined />, label: '设备总览' },
  { key: '/device/list', icon: <UnorderedListOutlined />, label: '设备列表' },
  { key: '/device/preview', icon: <PlayCircleOutlined />, label: '实时预览' },
  { key: '/device/config', icon: <ControlOutlined />, label: '设备配置' },
  { key: '/device/logs', icon: <FileSearchOutlined />, label: '设备日志' },
  { key: '/device/heatmap', icon: <HeatMapOutlined />, label: '热力图分析' },
  { key: '/device/channels', icon: <SwapOutlined />, label: '通道管理' },
  { key: '/device/firmware', icon: <CloudUploadOutlined />, label: '固件管理' },
  { key: '/device/security', icon: <SecurityScanOutlined />, label: '安全扫描' },
];

// 根据路径反推展开的菜单 key
function findOpenKeys(pathname: string): string[] {
  const mapping: Record<string, string> = {
    '/home/testcase': 'testcase',
    '/home/testdata': 'testdata',
    '/home/result': 'result',
    '/home/ci': 'ci',
    '/home/settings': 'settings',
  };
  for (const [prefix, key] of Object.entries(mapping)) {
    if (pathname.startsWith(prefix)) return [key];
  }
  return [];
}

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();

  const {
    collapsed, toggleCollapsed,
    activeModule, setActiveModule,
    homeOpenKeys, setHomeOpenKeys,
    deviceOpenKeys, setDeviceOpenKeys,
    backendOnline, setBackendOnline,
  } = useAppStore();

  // 后端健康检查
  useEffect(() => {
    const check = async () => {
      try { await healthCheck(); setBackendOnline(true); } catch { setBackendOnline(false); }
    };
    check();
    const t = setInterval(check, 30000);
    return () => clearInterval(t);
  }, [setBackendOnline]);

  // 暗色模式
  const [darkMode, setDarkMode] = React.useState(
    localStorage.getItem('clarity_dark_mode') === 'true'
  );
  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('clarity_dark_mode', String(next));
  };

  // 日夜间用简单 CSS 变量切换
  const containerBg = darkMode ? '#141414' : '#f5f5f5';
  const headerBg = darkMode ? '#1f1f1f' : '#fff';
  const siderBg = darkMode ? '#1f1f1f' : '#fff';
  const borderColor = darkMode ? '#303030' : token.colorBorderSecondary;
  const textColor = darkMode ? '#e8e8e8' : '#1f1f1f';

  // 选中菜单
  const selectedKey = location.pathname;
  const openKeys = activeModule === 'home' ? homeOpenKeys : deviceOpenKeys;
  const setOpenKeys = activeModule === 'home' ? setHomeOpenKeys : setDeviceOpenKeys;

  // 当路由变化时自动展开对应的父菜单
  useEffect(() => {
    const autoKeys = findOpenKeys(location.pathname);
    if (autoKeys.length > 0) {
      const current = activeModule === 'home' ? homeOpenKeys : deviceOpenKeys;
      const merged = [...new Set([...current, ...autoKeys])];
      setOpenKeys(merged);
    }
  }, [location.pathname]);

  const currentMenuItems = activeModule === 'home' ? homeMenuItems : deviceMenuItems;

  const goHome = () => {
    setActiveModule('home');
    navigate('/home/dashboard');
  };
  const goDevice = () => {
    setActiveModule('device');
    navigate('/device/dashboard');
  };

  return (
    <Layout style={{ minHeight: '100vh', background: containerBg }}>
      {/* 侧边栏 */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={toggleCollapsed}
        width={220}
        style={{
          background: siderBg,
          borderRight: `1px solid ${borderColor}`,
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
          overflow: 'hidden',
        }}
        trigger={null}
      >
        {/* Logo */}
        <div
          className="flex items-center justify-center h-14 cursor-pointer border-b"
          style={{
            borderBottom: `1px solid ${borderColor}`,
            color: textColor,
          }}
          onClick={goHome}
        >
          {collapsed ? (
            <AppstoreOutlined style={{ fontSize: 20, color: token.colorPrimary }} />
          ) : (
            <Text strong style={{ fontSize: 15, color: textColor }}>Clarity AI</Text>
          )}
        </div>

        {/* 折叠按钮 */}
        <div
          className="flex items-center justify-center h-7 border-b cursor-pointer"
          style={{ borderBottom: `1px solid ${borderColor}` }}
          onClick={toggleCollapsed}
        >
          <Text style={{ fontSize: 12, color: '#8c8c8c' }}>{collapsed ? '▶' : '◀ 折叠'}</Text>
        </div>

        {/* 菜单 - 可滚动 */}
        <div style={{ flex: 1, overflow: 'auto', height: 'calc(100vh - 130px)' }}>
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            openKeys={openKeys}
            onOpenChange={(keys) => setOpenKeys(keys)}
            items={currentMenuItems}
            onClick={({ key }) => {
              navigate(key);
              // 自动展开父菜单
              const autoKeys = findOpenKeys(key);
              if (autoKeys.length > 0) setOpenKeys(autoKeys);
            }}
            style={{ borderInlineEnd: 'none', background: 'transparent', color: textColor }}
            theme={darkMode ? 'dark' : 'light'}
          />
        </div>

        {/* 版本号 - 底部固定 */}
        {!collapsed && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              width: '100%',
              padding: '12px 16px',
              borderTop: `1px solid ${borderColor}`,
              background: siderBg,
            }}
          >
            <Text style={{ fontSize: 12, color: '#8c8c8c' }}>Clarity AI v1.0.0</Text>
          </div>
        )}
      </Sider>

      {/* 主区域 */}
      <Layout style={{ marginLeft: collapsed ? 56 : 220, transition: 'margin-left 0.2s' }}>
        {/* 顶栏 - 固定 */}
        <Header
          style={{
            background: headerBg,
            padding: '0 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: `1px solid ${borderColor}`,
            height: 56,
            position: 'sticky',
            top: 0,
            zIndex: 1000,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button
              type={activeModule === 'home' ? 'primary' : 'default'}
              icon={<HomeOutlined />}
              onClick={goHome}
              size="small"
            >
              回到首页
            </Button>
            <Button
              type={activeModule === 'device' ? 'primary' : 'default'}
              icon={<CloudServerOutlined />}
              onClick={goDevice}
              size="small"
            >
              设备中心
            </Button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Badge status={backendOnline ? 'success' : 'error'} text={backendOnline ? '后端已连接' : '后端离线'} />
            <Button
              icon={darkMode ? <SunOutlined /> : <MoonOutlined />}
              onClick={toggleDark}
              size="small"
              type="text"
            />
            <Text style={{ color: textColor }}>管理员</Text>
          </div>
        </Header>

        {/* 内容区 */}
        <Content style={{ padding: 24, background: containerBg, minHeight: 'calc(100vh - 56px)' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
