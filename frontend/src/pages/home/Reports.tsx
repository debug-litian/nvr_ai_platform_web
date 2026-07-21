import React, { useEffect, useState, useMemo } from 'react';
import {
  Card, Row, Col, Statistic, Button, Table, Tag, Modal, Form,
  Input, Select, Space, message, Progress, DatePicker, Descriptions,
} from 'antd';
import {
  DownloadOutlined, FileWordOutlined, PlusOutlined,
  FileTextOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import { gridDefaultProps } from '../../utils/gridOptions';
import api from '../../services/api';

ModuleRegistry.registerModules([AllCommunityModule]);

// ---- 类型 ----
interface BugItem {
  bug_number: string;
  bug_title: string;
  severity: string;
  bug_status: string;
  solution: string;
}

interface TestItem {
  category: string;
  status: string;
  result: string;
}

interface SubItem {
  sub_name: string;
  result: string;
  detail: string;
}

interface ReportRow {
  id: number;
  file_number: string;
  version: string;
  project_name: string;
  product_model: string;
  firmware_version: string;
  test_status: string;
  preparer: string;
  created_at: string;
}

// ---- Mock 测试大项 ----
const DEFAULT_TEST_ITEMS: TestItem[] = [
  { category: '功能测试', status: '已执行', result: 'PASS' },
  { category: '图像测试', status: '已执行', result: 'PASS' },
  { category: '音频测试', status: '已执行', result: 'PASS' },
  { category: 'Wi-Fi 测试', status: '已执行', result: 'PASS' },
  { category: '拷机测试', status: '已执行', result: 'PASS' },
  { category: '升级测试', status: '已执行', result: 'PASS' },
  { category: '兼容性测试', status: '已执行', result: 'PASS' },
  { category: '它端适配测试', status: '已执行', result: 'PASS' },
];

const DEFAULT_SUB_ITEMS: SubItem[] = [
  { sub_name: '图像', result: 'PASS', detail: '清晰度、色彩、IR-CUT 切换正常' },
  { sub_name: '音频', result: 'PASS', detail: '录音、对讲、回声消除正常' },
  { sub_name: 'Wi-Fi', result: 'PASS', detail: '2.4G/5G 连接稳定，信号强度达标' },
  { sub_name: '拷机', result: 'PASS', detail: '72h 连续运行无异常重启' },
];

const Reports: React.FC = () => {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailData, setDetailData] = useState<Record<string, unknown> | null>(null);
  const [form] = Form.useForm();

  const gridTheme = useMemo(() => themeQuartz.withParams({ accentColor: '#eb2f96' }), []);

  // 加载报告列表
  const loadReports = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/reports/list');
      setReports(data.reports || []);
    } catch { /* */ }
    setLoading(false);
  };

  useEffect(() => { loadReports(); }, []);

  // 生成报告
  const handleGenerate = () => {
    form.validateFields().then(async (values) => {
      setGenerating(true);
      setGenerateProgress(0);

      // 模拟进度
      const timer = setInterval(() => {
        setGenerateProgress((prev) => {
          if (prev >= 100) { clearInterval(timer); return 100; }
          return prev + Math.floor(Math.random() * 20 + 5);
        });
      }, 300);

      try {
        const payload = {
          report: {
            project_name: values.project_name || 'V3.6.5项目',
            product_model: values.product_model || 'NT98635E-6708v1 RP-N64',
            firmware_version: values.firmware_version || 'V3.6.5_260715',
            soc_info: values.soc_info || 'NT98635E',
            switch_info: values.switch_info || 'RTL8367S',
            flash_info: values.flash_info || 'Macronix MX30LF4G18AC',
            ddr_info: values.ddr_info || 'Nanya NT5CC256M16ER',
            product_manager: values.product_manager || '',
            project_manager: values.project_manager || '',
            dev_lead: values.dev_lead || '',
            hardware_lead: values.hardware_lead || '',
            structure_lead: values.structure_lead || '',
            test_lead: values.test_lead || '',
            preparer: values.preparer || '测试工程师',
            test_range: values.test_range || '功能测试 / 专项测试 / 升级测试 / 兼容性测试',
            test_strategy: values.test_strategy || '',
          },
          bugs: [
            { bug_number: 'BUG-001', bug_title: '低照度下图像噪点偏高', severity: 'Severe', bug_status: 'Open', solution: '优化3D降噪参数' },
            { bug_number: 'BUG-002', bug_title: '5G WiFi偶发断连', severity: 'Critical', bug_status: 'Open', solution: '更新Wi-Fi驱动' },
            { bug_number: 'BUG-003', bug_title: '音频对讲延迟>500ms', severity: 'Severe', bug_status: 'Fixed', solution: '调整音频缓冲区大小' },
            { bug_number: 'BUG-004', bug_title: '云台预置位偏差', severity: 'Minor', bug_status: 'Open', solution: '校准步进电机' },
          ],
          test_items: DEFAULT_TEST_ITEMS,
          sub_items: DEFAULT_SUB_ITEMS,
        };

        const { data } = await api.post('/reports/generate', payload);
        if (data.status === 'ok') {
          message.success(`报告已生成! 文件编号: ${data.id}`);
          loadReports();
        }
      } catch {
        message.error('生成失败');
      }

      clearInterval(timer);
      setGenerateProgress(100);
      setTimeout(() => { setGenerating(false); setGenerateProgress(0); setModalOpen(false); }, 1000);
    }).catch(() => {});
  };

  // 查看详情
  const handleDetail = async (id: number) => {
    try {
      const { data } = await api.get(`/reports/${id}`);
      setDetailData(data);
    } catch {
      message.error('获取详情失败');
    }
  };

  // 下载
  const handleDownload = (id: number) => {
    window.open(`http://127.0.0.1:8000/api/reports/${id}/download`, '_blank');
  };

  // AG Grid 列
  const columnDefs = [
    { field: 'id', headerName: 'ID', width: 60 },
    { field: 'file_number', headerName: '文件编号', width: 220 },
    { field: 'version', headerName: '版次', width: 80 },
    { field: 'project_name', headerName: '项目名称', width: 160 },
    { field: 'product_model', headerName: '产品型号', width: 180 },
    { field: 'firmware_version', headerName: '固件版本', width: 140 },
    {
      field: 'test_status', headerName: '状态', width: 90,
      cellRenderer: ({ value }: { value: string }) => (
        <Tag color={value === 'PUBLISHED' ? 'success' : 'default'}>
          {value === 'PUBLISHED' ? '已发布' : '草稿'}
        </Tag>
      ),
    },
    { field: 'preparer', headerName: '编制人', width: 100 },
    { field: 'created_at', headerName: '创建时间', width: 170 },
    {
      headerName: '操作', width: 180, pinned: 'right' as const,
      cellRenderer: ({ data }: { data: ReportRow }) => (
        <Space size="small">
          <Button type="link" size="small" icon={<FileTextOutlined />} onClick={() => handleDetail(data.id)}>详情</Button>
          {data.test_status === 'PUBLISHED' && (
            <Button type="link" size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(data.id)}>下载</Button>
          )}
        </Space>
      ),
    },
  ];

  // 统计
  const published = reports.filter((r) => r.test_status === 'PUBLISHED').length;
  const draft = reports.filter((r) => r.test_status !== 'PUBLISHED').length;

  return (
    <div className="page-container">
      <h2 style={{ marginBottom: 16 }}>📈 测试报告</h2>

      {/* 统计 + 生成按钮 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={4}><Card><Statistic title="已发布" value={published} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col span={4}><Card><Statistic title="草稿" value={draft} prefix={<FileWordOutlined />} /></Card></Col>
        <Col span={8}>
          <Card>
            <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => setModalOpen(true)} block>
              生成报告 (.docx)
            </Button>
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Button icon={<DownloadOutlined />} onClick={loadReports} loading={loading} block>刷新列表</Button>
          </Card>
        </Col>
      </Row>

      {/* 生成进度条 */}
      {generating && <Progress percent={generateProgress} status="active" style={{ marginBottom: 16 }} />}

      {/* 报告列表 */}
      <Card title="报告列表" size="small">
        <div style={{ height: 500, width: '100%' }}>
          <AgGridReact<ReportRow>
            theme={gridTheme}
            rowData={reports}
            columnDefs={columnDefs}
            {...gridDefaultProps}
          />
        </div>
      </Card>

      {/* 生成报告弹窗 */}
      <Modal
        title="生成 L2 测试报告"
        open={modalOpen}
        onOk={handleGenerate}
        onCancel={() => setModalOpen(false)}
        okText="生成 Word 文档"
        cancelText="取消"
        width={700}
        confirmLoading={generating}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="project_name" label="项目名称" initialValue="V3.6.5项目 NT98635E-6708v1 RP-N64">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="product_model" label="产品型号" initialValue="NT98635E-6708v1 RP-N64">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="firmware_version" label="固件版本" initialValue="V3.6.5_260715">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="soc_info" label="SoC" initialValue="NT98635E">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="preparer" label="编制人" initialValue="测试工程师">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={8}><Form.Item name="product_manager" label="产品经理"><Input placeholder="姓名" /></Form.Item></Col>
            <Col span={8}><Form.Item name="project_manager" label="项目经理"><Input placeholder="姓名" /></Form.Item></Col>
            <Col span={8}><Form.Item name="dev_lead" label="开发负责人"><Input placeholder="姓名" /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={8}><Form.Item name="hardware_lead" label="硬件负责人"><Input placeholder="姓名" /></Form.Item></Col>
            <Col span={8}><Form.Item name="structure_lead" label="结构负责人"><Input placeholder="姓名" /></Form.Item></Col>
            <Col span={8}><Form.Item name="test_lead" label="测试负责人"><Input placeholder="姓名" /></Form.Item></Col>
          </Row>
          <Form.Item name="test_range" label="测试范围" initialValue="功能测试 / 专项测试 / 升级测试 / 兼容性测试">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="test_strategy" label="测试策略">
            <Input.TextArea rows={3} placeholder="1. 功能测试：逐项验证各功能模块。&#10;2. 专项测试：图像、音频、Wi-Fi、拷机。&#10;3. 升级测试：验证固件升级路径。" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 报告详情弹窗 */}
      <Modal
        title={detailData ? `报告详情 — ${(detailData as Record<string, unknown>).file_number || ''}` : ''}
        open={!!detailData}
        onCancel={() => setDetailData(null)}
        footer={null}
        width={900}
      >
        {detailData && (
          <div>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="文件编号">{(detailData as Record<string, unknown>).file_number as string}</Descriptions.Item>
              <Descriptions.Item label="版次">{(detailData as Record<string, unknown>).version as string}</Descriptions.Item>
              <Descriptions.Item label="项目名称">{(detailData as Record<string, unknown>).project_name as string}</Descriptions.Item>
              <Descriptions.Item label="产品型号">{(detailData as Record<string, unknown>).product_model as string}</Descriptions.Item>
              <Descriptions.Item label="固件版本">{(detailData as Record<string, unknown>).firmware_version as string}</Descriptions.Item>
              <Descriptions.Item label="测试状态">{(detailData as Record<string, unknown>).test_status as string}</Descriptions.Item>
              <Descriptions.Item label="编制人">{(detailData as Record<string, unknown>).preparer as string}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{(detailData as Record<string, unknown>).created_at as string}</Descriptions.Item>
            </Descriptions>

            {/* Bug 列表 */}
            {((detailData as Record<string, unknown>).bugs as unknown[] || []).length > 0 && (
              <>
                <h4 style={{ marginTop: 16 }}>Bug 清单</h4>
                <Table
                  dataSource={((detailData as Record<string, unknown>).bugs as unknown[] || []) as Record<string, unknown>[]}
                  rowKey="bug_number"
                  size="small"
                  pagination={false}
                  columns={[
                    { title: '编号', dataIndex: 'bug_number', width: 100 },
                    { title: '标题', dataIndex: 'bug_title' },
                    { title: '严重程度', dataIndex: 'severity', width: 90, render: (v: string) => <Tag color={v === 'Critical' ? 'red' : v === 'Severe' ? 'orange' : 'default'}>{v}</Tag> },
                    { title: '状态', dataIndex: 'bug_status', width: 80 },
                    { title: '解决方案', dataIndex: 'solution' },
                  ]}
                />
              </>
            )}

            {/* 下载按钮 */}
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <Button type="primary" icon={<DownloadOutlined />} onClick={() => handleDownload((detailData as Record<string, unknown>).id as number)}>
                下载 Word 文档
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Reports;
