import React, { useState, useRef, useEffect } from 'react';
import { Card, Input, Button, Space, Row, Col, Statistic, Tag } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, LaptopOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { useAppStore } from '../../store/useAppStore';

/* ---- 设备总览 ---- */
interface DeviceItem {
  key: string;
  name: string;
  ip: string;
  channel: number;
  status: 'online' | 'offline' | 'warning';
  lastOnline: string;
}

const MOCK_DEVICES: DeviceItem[] = [
  { key: '1', name: 'NVR-RLN16-410', ip: '192.168.124.2', channel: 16, status: 'online', lastOnline: '2025-07-16 14:30' },
  { key: '2', name: 'NVR-RLN8-410', ip: '192.168.124.10', channel: 8, status: 'online', lastOnline: '2025-07-16 14:28' },
  { key: '3', name: 'IPC-Bullet-C1', ip: '192.168.124.20', channel: 1, status: 'offline', lastOnline: '2025-07-15 08:00' },
  { key: '4', name: 'IPC-Dome-D1', ip: '192.168.124.21', channel: 1, status: 'online', lastOnline: '2025-07-16 14:25' },
  { key: '5', name: 'IPC-PTZ-P1', ip: '192.168.124.22', channel: 1, status: 'warning', lastOnline: '2025-07-16 14:20' },
];

const DeviceDashboard: React.FC = () => {
  const [devices] = useState<DeviceItem[]>(MOCK_DEVICES);
  const { darkMode } = useAppStore() as { darkMode: boolean };

  const online = devices.filter((d) => d.status === 'online').length;
  const offline = devices.filter((d) => d.status === 'offline').length;
  const warn = devices.filter((d) => d.status === 'warning').length;

  // ECharts 饼图 — 设备状态分布
  const pieOption = {
    title: { text: '设备状态分布', left: 'center' },
    tooltip: { trigger: 'item' as const },
    legend: { bottom: 0 },
    series: [{
      type: 'pie' as const, radius: ['45%', '75%'],
      data: [
        { name: '在线', value: online, itemStyle: { color: '#52c41a' } },
        { name: '离线', value: offline, itemStyle: { color: '#ff4d4f' } },
        { name: '告警', value: warn, itemStyle: { color: '#faad14' } },
      ],
      label: { show: true, formatter: '{b}: {c}' },
    }],
  };

  // ECharts 柱状图 — 近30天每日录像趋势（模拟数据）
  const days = Array.from({ length: 30 }, (_, i) => `${i + 1}日`);
  const trendData = days.map(() => Math.floor(Math.random() * 200 + 50));
  const trendOption = {
    title: { text: '近30天每日录像趋势', left: 'center' },
    tooltip: { trigger: 'axis' as const },
    xAxis: { type: 'category' as const, data: days, axisLabel: { interval: 5 } },
    yAxis: { type: 'value' as const, name: '录像数' },
    series: [{
      type: 'bar' as const, data: trendData,
      itemStyle: { color: '#1677ff', borderRadius: [4, 4, 0, 0] },
    }],
    grid: { left: 50, right: 20, top: 40, bottom: 40 },
  };

  return (
    <div className="page-container">
      <h2 style={{ marginBottom: 16 }}>设备总览</h2>

      {/* 4 个统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}><Card><Statistic title="设备总数" value={devices.length} prefix={<LaptopOutlined />} /></Card></Col>
        <Col span={6}><Card><Statistic title="在线" value={online} valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="离线" value={offline} valueStyle={{ color: '#ff4d4f' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="告警" value={warn} valueStyle={{ color: '#faad14' }} /></Card></Col>
      </Row>

      {/* ECharts 图表 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}><Card><ReactECharts option={pieOption} style={{ height: 350 }} /></Card></Col>
        <Col span={12}><Card><ReactECharts option={trendOption} style={{ height: 350 }} /></Card></Col>
      </Row>

      {/* 设备列表（精简版，最近 10 条） */}
      <Card title="设备列表（最近 10 条）" size="small">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {devices.slice(0, 10).map((d) => (
            <Card key={d.key} size="small" style={{ width: 200 }}>
              <div style={{ fontWeight: 600 }}>{d.name}</div>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>{d.ip}</div>
              <div style={{ marginTop: 8 }}>
                <Tag color={d.status === 'online' ? 'success' : d.status === 'offline' ? 'error' : 'warning'}>
                  {d.status === 'online' ? '在线' : d.status === 'offline' ? '离线' : '告警'}
                </Tag>
                <span style={{ fontSize: 12, color: '#8c8c8c' }}>通道: {d.channel}</span>
              </div>
              <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 4 }}>{d.lastOnline}</div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default DeviceDashboard;
