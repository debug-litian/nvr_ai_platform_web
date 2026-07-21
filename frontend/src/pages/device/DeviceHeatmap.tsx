import React, { useState, useMemo } from 'react';
import { Card, Tabs, Select, Row, Col, Statistic, Tag, Table } from 'antd';
import ReactECharts from 'echarts-for-react';

// 模拟设备列表
const DEVICES = [
  { id: 1, name: '通道1 - 门口', color: '#1677ff' },
  { id: 2, name: '通道2 - 大厅', color: '#52c41a' },
  { id: 3, name: '通道3 - 后院', color: '#faad14' },
  { id: 4, name: '通道4 - 车库', color: '#722ed1' },
];

// 模拟事件数据
const MOCK_EVENTS = [
  { time: '14:30:25', type: '人形入侵', channel: '通道1', confidence: 87 },
  { time: '14:30:18', type: '车辆驶入', channel: '通道2', confidence: 92 },
  { time: '14:29:55', type: '宠物出没', channel: '通道3', confidence: 50 },
  { time: '14:29:30', type: '人形徘徊', channel: '通道1', confidence: 78 },
  { time: '14:28:10', type: '人形入侵', channel: '通道4', confidence: 85 },
  { time: '14:27:45', type: '车辆驶离', channel: '通道2', confidence: 90 },
  { time: '14:26:20', type: '区域闯入', channel: '通道1', confidence: 95 },
];

const DeviceHeatmap: React.FC = () => {
  const [selectedDevice, setSelectedDevice] = useState(1);

  // 热力图数据（24小时 x 7天）
  const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);
  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const heatData: [number, number, number][] = [];
  for (let h = 0; h < 24; h++) for (let d = 0; d < 7; d++) heatData.push([h, d, Math.floor(Math.random() * 15)]);

  const heatmapOption = {
    title: { text: '报警时间热力图', left: 'center' },
    tooltip: { position: 'top' as const },
    grid: { left: 80, right: 40, bottom: 80, top: 40 },
    xAxis: { type: 'category' as const, data: hours, name: '小时', axisLabel: { interval: 2 } },
    yAxis: { type: 'category' as const, data: days, name: '星期' },
    visualMap: { min: 0, max: 15, calculable: true, orient: 'horizontal' as const, left: 'center', bottom: 0 },
    series: [{ type: 'heatmap' as const, data: heatData, label: { show: false } }],
  };

  // 入侵趋势折线图
  const trendData = Array.from({ length: 24 }, () => Math.floor(Math.random() * 20));
  const trendOption = {
    title: { text: '24h 入侵趋势', left: 'center' },
    tooltip: { trigger: 'axis' as const },
    xAxis: { type: 'category' as const, data: hours, axisLabel: { interval: 2 } },
    yAxis: { type: 'value' as const },
    series: [{
      type: 'line' as const, data: trendData, smooth: true,
      itemStyle: { color: '#1677ff' }, areaStyle: { color: 'rgba(22,119,255,0.1)' },
    }],
    grid: { left: 40, right: 20, top: 40, bottom: 30 },
  };

  const tabItems = [
    {
      key: 'events', label: '实时事件',
      children: (
        <div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
            {['人形入侵', '车辆驶入', '区域闯入', '徘徊检测'].map((t) => (
              <Card key={t} size="small" style={{ flex: '1 1 150px', minWidth: 130 }}>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>{t}</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{Math.floor(Math.random() * 50)}</div>
              </Card>
            ))}
          </div>
          <Table
            dataSource={MOCK_EVENTS}
            rowKey="time"
            size="small"
            pagination={{ pageSize: 6 }}
            columns={[
              { title: '时间', dataIndex: 'time', width: 100 },
              { title: '事件类型', dataIndex: 'type', width: 120, render: (v: string) => <Tag color="error">{v}</Tag> },
              { title: '通道', dataIndex: 'channel', width: 80 },
              { title: '置信度', dataIndex: 'confidence', width: 80, render: (v: number) => `${v}%` },
            ]}
          />
        </div>
      ),
    },
    { key: 'intrusion', label: '入侵统计', children: <ReactECharts option={trendOption} style={{ height: 350 }} /> },
    { key: 'loitering', label: '徘徊统计', children: <div style={{ textAlign: 'center', padding: 48, color: '#8c8c8c' }}>徘徊统计数据 — 待实现</div> },
    { key: 'privacy', label: '隐私区域', children: <div style={{ textAlign: 'center', padding: 48, color: '#8c8c8c' }}>隐私区域配置 — 待实现</div> },
    { key: 'trend', label: '热力趋势', children: <ReactECharts option={heatmapOption} style={{ height: 400 }} /> },
  ];

  return (
    <div className="page-container">
      <h2 style={{ marginBottom: 16 }}>热力图分析</h2>

      <Row gutter={16}>
        {/* 左侧：设备列表 */}
        <Col span={4}>
          <Card title="设备列表" size="small" style={{ height: 'calc(100vh - 150px)', overflow: 'auto' }}>
            {DEVICES.map((d) => (
              <div
                key={d.id}
                onClick={() => setSelectedDevice(d.id)}
                style={{
                  padding: '8px 12px', borderRadius: 6, cursor: 'pointer', marginBottom: 8,
                  background: selectedDevice === d.id ? d.color : 'transparent',
                  color: selectedDevice === d.id ? '#fff' : 'inherit',
                }}
              >
                <div style={{ fontWeight: 600 }}>{d.name}</div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>12 路流 | 24h 录像</div>
              </div>
            ))}
          </Card>
        </Col>

        {/* 中间：视频画面 */}
        <Col span={10}>
          <Card title={`${DEVICES.find((d) => d.id === selectedDevice)?.name} — 实时画面`} size="small">
            <div
              style={{
                background: '#1f1f1f', height: 400, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
              }}
            >
              {/* 模拟画面 */}
              <div style={{ color: '#8c8c8c', textAlign: 'center' }}>
                <div style={{ fontSize: 48 }}>📹</div>
                <div>视频画面</div>
                <div style={{ fontSize: 12 }}>检测框叠加区域</div>
              </div>
              {/* 模拟检测框 */}
              <div style={{ position: 'absolute', top: 60, left: 80, border: '2px solid #52c41a', width: 120, height: 180, borderRadius: 4 }}>
                <span style={{ position: 'absolute', top: -20, left: 0, color: '#52c41a', fontSize: 12 }}>人形 87%</span>
              </div>
              <div style={{ position: 'absolute', bottom: 100, right: 80, border: '2px solid #1677ff', width: 100, height: 100, borderRadius: 4 }}>
                <span style={{ position: 'absolute', top: -20, left: 0, color: '#1677ff', fontSize: 12 }}>车辆 92%</span>
              </div>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: '#8c8c8c' }}>帧率: 25fps | 分辨率: 1920x1080</div>
          </Card>
        </Col>

        {/* 右侧：5 个 Tab */}
        <Col span={10}>
          <Card size="small" style={{ height: 'calc(100vh - 150px)', overflow: 'auto' }}>
            <Tabs defaultActiveKey="events" items={tabItems} />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DeviceHeatmap;
