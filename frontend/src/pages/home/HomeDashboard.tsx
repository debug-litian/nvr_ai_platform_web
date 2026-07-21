import React, { useState, useMemo } from 'react';
import {
  Card, Row, Col, Statistic, DatePicker, Select, Space, Tag,
} from 'antd';
import {
  ProjectOutlined, ClockCircleOutlined, TeamOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import { gridDefaultProps } from '../../utils/gridOptions';

ModuleRegistry.registerModules([AllCommunityModule]);

const { RangePicker } = DatePicker;

// ---- Mock 数据 ----
interface TaskRow {
  id: number;
  productStatus: string;
  productName: string;
  versionName: string;
  priority: string;
  deadline: string;
  owner: string;
  progress: string;
  note: string;
}

const MOCK_TASKS: TaskRow[] = [
  { id: 1, productStatus: '进行中', productName: 'NVR AI Platform', versionName: 'v1.3.0', priority: '带宽优化', deadline: '2025-08-01', owner: '张三', progress: '80%', note: '' },
  { id: 2, productStatus: '进行中', productName: 'IPC Camera Pro', versionName: 'v2.1.0', priority: '蓝牙测试', deadline: '2025-08-15', owner: '张三', progress: '45%', note: '依赖固件更新' },
  { id: 3, productStatus: '待交付', productName: 'Smart Doorbell', versionName: 'v1.0.0', priority: '音频测试', deadline: '2025-07-25', owner: '张三', progress: '90%', note: '' },
  { id: 4, productStatus: '进行中', productName: 'NVR AI Platform', versionName: 'v1.4.0', priority: '热力图分析', deadline: '2025-09-01', owner: '张三', progress: '20%', note: '新功能开发中' },
  { id: 5, productStatus: '待交付', productName: 'PTZ Controller', versionName: 'v2.0.1', priority: '稳定性测试', deadline: '2025-07-30', owner: '张三', progress: '75%', note: '' },
  { id: 6, productStatus: '已交付', productName: 'IPC Camera Pro', versionName: 'v1.8.0', priority: '回归测试', deadline: '2025-07-10', owner: '张三', progress: '100%', note: '已发布' },
  { id: 7, productStatus: '进行中', productName: 'NVR AI Platform', versionName: 'v1.3.1', priority: '带宽测试', deadline: '2025-08-05', owner: '李四', progress: '60%', note: '' },
  { id: 8, productStatus: '待交付', productName: 'Smart Doorbell', versionName: 'v1.0.1', priority: '图像测试', deadline: '2025-08-10', owner: '张三', progress: '50%', note: '待硬件到位' },
];

// ---- 产品集合列表 ----
const PRODUCT_OPTIONS = ['NVR AI Platform', 'IPC Camera Pro', 'Smart Doorbell', 'PTZ Controller'];

// ---- 项目概况组件 ----
const HomeDashboard: React.FC = () => {
  const gridTheme = useMemo(() => themeQuartz.withParams({ accentColor: '#eb2f96' }), []);

  // 筛选状态
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);
  const [filterProducts, setFilterProducts] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);

  // 筛选后的数据
  const filteredTasks = useMemo(() => {
    return MOCK_TASKS.filter((t) => {
      if (dateRange && dateRange[0] && dateRange[1]) {
        const d = new Date(t.deadline);
        if (d < dateRange[0].toDate() || d > dateRange[1].toDate()) return false;
      }
      if (filterProducts.length > 0 && !filterProducts.includes(t.productName)) return false;
      if (filterStatus && t.productStatus !== filterStatus) return false;
      return true;
    });
  }, [dateRange, filterProducts, filterStatus]);

  // KPI
  const activeProjects = [...new Set(filteredTasks.filter(t => t.productStatus === '进行中').map(t => t.productName))].length;
  const pendingDelivery = filteredTasks.filter(t => t.productStatus === '待交付').length;
  const totalManDays = filteredTasks.length * 3; // 模拟人天
  const avgRejectTimes = 2.1;

  // 图表1 — 测试项目类别分布（饼图）
  const categoryOption = {
    title: { text: '测试项目类别分布', left: 'center' },
    tooltip: { trigger: 'item' as const },
    series: [{
      type: 'pie' as const, radius: ['40%', '70%'],
      data: PRODUCT_OPTIONS.map((p, i) => ({
        name: p,
        value: filteredTasks.filter(t => t.productName === p).length,
        itemStyle: { color: ['#1677ff', '#52c41a', '#faad14', '#ff4d4f'][i] },
      })),
      label: { formatter: '{b}: {c}' },
    }],
  };

  // 图表2 — 测试参与程度分布（饼图）
  const participationOption = {
    title: { text: '测试参与程度分布', left: 'center' },
    tooltip: { trigger: 'item' as const },
    series: [{
      type: 'pie' as const, radius: ['40%', '70%'],
      data: ['张三', '李四'].map((name, i) => ({
        name,
        value: filteredTasks.filter(t => t.owner === name).length,
        itemStyle: { color: ['#1677ff', '#52c41a'][i] },
      })),
      label: { formatter: '{b}: {c} 项' },
    }],
  };

  // 图表3 — 产品集合项目数量（水平条形图）
  const perProductData = PRODUCT_OPTIONS.map(p => filteredTasks.filter(t => t.productName === p).length);
  const barOption = {
    title: { text: '各产品集合项目数量', left: 'center' },
    tooltip: { trigger: 'axis' as const },
    xAxis: { type: 'value' as const },
    yAxis: { type: 'category' as const, data: PRODUCT_OPTIONS },
    series: [{
      type: 'bar' as const, data: perProductData,
      itemStyle: { color: '#1677ff', borderRadius: [0, 4, 4, 0] },
      label: { show: true, position: 'right' as const },
    }],
    grid: { left: 150, right: 50 },
  };

  // 图表4 — 项目周期甘特图（简化为条形图：计划 vs 实际）
  const ganttOption = {
    title: { text: '项目周期（计划 vs 实际）', left: 'center' },
    tooltip: { trigger: 'axis' as const },
    legend: { data: ['计划天数', '实际天数'] },
    xAxis: { type: 'category' as const, data: filteredTasks.slice(0, 5).map(t => `${t.productName} ${t.versionName}`) },
    yAxis: { type: 'value' as const, name: '天' },
    series: [
      { name: '计划天数', type: 'bar' as const, data: [15, 20, 10, 30, 12], itemStyle: { color: '#1677ff' } },
      { name: '实际天数', type: 'bar' as const, data: [18, 25, 10, 28, 12], itemStyle: { color: '#faad14' } },
    ],
    grid: { left: 60, right: 20, bottom: 60 },
    dataZoom: [{ type: 'slider' as const, height: 20, bottom: 0 }],
  };

  // 图表5 — 版本打回次数 Top5（水平条形图）
  const rejectOption = {
    title: { text: '版本打回次数 Top5', left: 'center' },
    tooltip: { trigger: 'axis' as const },
    xAxis: { type: 'value' as const },
    yAxis: { type: 'category' as const, data: ['v1.3.0', 'v2.1.0', 'v1.0.1', 'v2.0.1', 'v1.4.0'] },
    series: [{ type: 'bar' as const, data: [5, 3, 2, 1, 1], itemStyle: { color: '#ff4d4f', borderRadius: [0, 4, 4, 0] }, label: { show: true, position: 'right' as const } }],
    grid: { left: 80, right: 40 },
  };

  // AG Grid 列定义
  const columnDefs = [
    { field: 'productStatus', headerName: '产品状态', width: 90, cellRenderer: ({ value }: any) => {
      const color = value === '进行中' ? 'processing' : value === '待交付' ? 'warning' : 'success';
      return <Tag color={color}>{value}</Tag>;
    }},
    { field: 'productName', headerName: '产品名称', width: 160 },
    { field: 'versionName', headerName: '规划版本', width: 120 },
    { field: 'priority', headerName: '重点工作项', width: 140 },
    { field: 'deadline', headerName: 'Deadline', width: 110 },
    { field: 'owner', headerName: '测试负责人', width: 100 },
    { field: 'progress', headerName: '任务状态进展', width: 110, cellRenderer: ({ value }: any) => {
      const pct = parseInt(value);
      const color = pct >= 100 ? '#52c41a' : pct >= 50 ? '#1677ff' : '#faad14';
      return <span style={{ color, fontWeight: 600 }}>{value}</span>;
    }},
    { field: 'note', headerName: '备注', flex: 1, minWidth: 150 },
  ];

  return (
    <div className="page-container">
      <h2 style={{ marginBottom: 16 }}>项目概况</h2>

      {/* 筛选栏 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <RangePicker value={dateRange} onChange={(v) => setDateRange(v as any)} placeholder={['开始日期', '结束日期']} />
          <Select
            mode="multiple"
            placeholder="产品名称"
            value={filterProducts}
            onChange={setFilterProducts}
            allowClear
            style={{ minWidth: 200 }}
            maxTagCount={2}
            options={PRODUCT_OPTIONS.map((p) => ({ value: p, label: p }))}
          />
          <Select
            placeholder="产品状态"
            value={filterStatus}
            onChange={setFilterStatus}
            allowClear
            style={{ width: 130 }}
            options={['进行中', '待交付', '已交付'].map((s) => ({ value: s, label: s }))}
          />
          <Tag color="blue">筛选结果: {filteredTasks.length} 条</Tag>
        </Space>
      </Card>

      {/* KPI 卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card><Statistic title="进行中项目总数" value={activeProjects} prefix={<ProjectOutlined />} valueStyle={{ color: '#1677ff' }} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="本周待交付项目" value={pendingDelivery} prefix={<ClockCircleOutlined />} valueStyle={{ color: '#faad14' }} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="总投入人天" value={totalManDays} prefix={<TeamOutlined />} suffix="人天" /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="平均版本打回次数" value={avgRejectTimes} prefix={<ExclamationCircleOutlined />} precision={1} valueStyle={{ color: '#ff4d4f' }} /></Card>
        </Col>
      </Row>

      {/* 图表行1：饼图 + 饼图 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}><Card><ReactECharts option={categoryOption} style={{ height: 350 }} /></Card></Col>
        <Col span={12}><Card><ReactECharts option={participationOption} style={{ height: 350 }} /></Card></Col>
      </Row>

      {/* 图表行2：水平条形图 + 甘特图 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}><Card><ReactECharts option={barOption} style={{ height: 350 }} /></Card></Col>
        <Col span={12}><Card><ReactECharts option={ganttOption} style={{ height: 350 }} /></Card></Col>
      </Row>

      {/* 图表行3：打回次数 + 空白（或再加其他） */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}><Card><ReactECharts option={rejectOption} style={{ height: 350 }} /></Card></Col>
        <Col span={12} />
      </Row>

      {/* 底部 AG Grid 表格 */}
      <Card title="个人测试任务" size="small">
        <div style={{ height: 400, width: '100%' }}>
          <AgGridReact
            theme={gridTheme}
            rowData={filteredTasks}
            columnDefs={columnDefs}
            {...gridDefaultProps}
          />
        </div>
      </Card>
    </div>
  );
};

export default HomeDashboard;
