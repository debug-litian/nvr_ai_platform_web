import React, { useState, useMemo, useCallback } from 'react';
import { Button, Input, Select, Space, Modal, Form, message, Tag, Progress } from 'antd';
import { PlusOutlined, EditOutlined, CopyOutlined, DeleteOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import type { ColDef } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

interface TestCaseRow {
  id: number;
  caseName: string;
  moduleName: string;
  priority: string;
  status: string;
  createTime: string;
  description: string;
}

const MOCK_MODULES = ['带宽测试', '光耦矫正', 'IPC蓝牙测试', '中心偏差校准', '图像测试', 'IPC老化'];
const PRIORITIES = ['P0', 'P1', 'P2', 'P3'];
const STATUSES = ['启用', '禁用'];

const MOCK_DATA: TestCaseRow[] = [
  { id: 1, caseName: '带宽测试-2.4G', moduleName: '带宽测试', priority: 'P0', status: '启用', createTime: '2025-01-15', description: '测试2.4G WiFi带宽' },
  { id: 2, caseName: '带宽测试-5G', moduleName: '带宽测试', priority: 'P1', status: '启用', createTime: '2025-01-15', description: '测试5G WiFi带宽' },
  { id: 3, caseName: '光耦矫正验证', moduleName: '光耦矫正', priority: 'P1', status: '启用', createTime: '2025-02-01', description: '验证光耦偏差值校准' },
  { id: 4, caseName: '蓝牙信号强度测试', moduleName: 'IPC蓝牙测试', priority: 'P2', status: '启用', createTime: '2025-02-10', description: '测试蓝牙信号强度阈值' },
  { id: 5, caseName: 'IR-CUT切换测试', moduleName: '图像测试', priority: 'P0', status: '禁用', createTime: '2025-03-05', description: '测试IR-CUT黑白彩色切换' },
  { id: 6, caseName: 'FTP上传验证', moduleName: '图像测试', priority: 'P1', status: '启用', createTime: '2025-04-12', description: '验证FTP上传图片/视频' },
  { id: 7, caseName: '老化测试-自动', moduleName: 'IPC老化', priority: 'P3', status: '启用', createTime: '2025-05-01', description: '老化测试自动启动' },
];

const TestCaseList: React.FC = () => {
  const [rowData, setRowData] = useState<TestCaseRow[]>(MOCK_DATA);
  const [searchText, setSearchText] = useState('');
  const [filterModules, setFilterModules] = useState<string[]>([]);
  const [filterPriority, setFilterPriority] = useState<string | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<TestCaseRow | null>(null);
  const [form] = Form.useForm();
  const [nextId, setNextId] = useState(8);
  const [executing, setExecuting] = useState(false);
  const [execProgress, setExecProgress] = useState(0);
  const navigate = useNavigate();

  const gridTheme = useMemo(() => themeQuartz.withParams({ accentColor: '#eb2f96' }), []);

  const filteredData = useMemo(() => {
    return rowData.filter((row) => {
      if (searchText) {
        const kw = searchText.toLowerCase();
        if (!row.caseName.toLowerCase().includes(kw) && !row.description.toLowerCase().includes(kw)) return false;
      }
      if (filterModules.length > 0 && !filterModules.includes(row.moduleName)) return false;
      if (filterPriority && row.priority !== filterPriority) return false;
      return true;
    });
  }, [rowData, searchText, filterModules, filterPriority]);

  const openModal = useCallback((row?: TestCaseRow) => {
    if (row) { setEditingRow(row); form.setFieldsValue(row); }
    else { setEditingRow(null); form.resetFields(); }
    setModalOpen(true);
  }, [form]);

  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields();
      if (editingRow) {
        setRowData((prev) => prev.map((r) => (r.id === editingRow.id ? { ...r, ...values } : r)));
        message.success('测试用例已更新');
      } else {
        setRowData((prev) => [...prev, { id: nextId, ...values, createTime: new Date().toISOString().slice(0, 10) }]);
        setNextId((id) => id + 1);
        message.success('测试用例已添加');
      }
      setModalOpen(false); form.resetFields();
    } catch { /* 校验失败 */ }
  }, [editingRow, form, nextId]);

  const handleCopy = useCallback((row: TestCaseRow) => {
    const text = `${row.caseName}\t${row.moduleName}\t${row.priority}\t${row.status}\t${row.description}`;
    navigator.clipboard.writeText(text).then(() => message.success('已复制')).catch(() => message.error('复制失败'));
  }, []);

  const handleDelete = useCallback((row: TestCaseRow) => {
    Modal.confirm({
      title: '确认删除', content: `确定要删除测试用例 "${row.caseName}" 吗？`, okText: '删除', okType: 'danger', cancelText: '取消',
      onOk: () => { setRowData((prev) => prev.filter((r) => r.id !== row.id)); message.success('已删除'); },
    });
  }, []);

  // 执行测试用例
  const handleExecute = useCallback((row: TestCaseRow) => {
    Modal.confirm({
      title: '确认执行',
      content: `确认立即执行该测试用例吗？\n\n用例: ${row.caseName}\n模块: ${row.moduleName}`,
      okText: '确认执行',
      cancelText: '取消',
      onOk: () => {
        setExecuting(true);
        setExecProgress(0);
        // 模拟执行进度
        const timer = setInterval(() => {
          setExecProgress((prev) => {
            if (prev >= 100) {
              clearInterval(timer);
              setExecuting(false);
              message.success(`测试用例 "${row.caseName}" 执行完成`);
              navigate('/home/result/overview');
              return 0;
            }
            return prev + 20;
          });
        }, 500);
      },
    });
  }, [navigate]);

  const columnDefs: ColDef<TestCaseRow>[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'caseName', headerName: '用例名称', width: 200 },
    { field: 'moduleName', headerName: '所属模块', width: 140 },
    {
      field: 'priority', headerName: '优先级', width: 90,
      cellRenderer: ({ value }: { value: string }) => {
        const color = value === 'P0' ? 'red' : value === 'P1' ? 'orange' : value === 'P2' ? 'blue' : 'default';
        return <Tag color={color}>{value}</Tag>;
      },
    },
    {
      field: 'status', headerName: '状态', width: 80,
      cellRenderer: ({ value }: { value: string }) => <Tag color={value === '启用' ? 'success' : 'default'}>{value}</Tag>,
    },
    { field: 'createTime', headerName: '创建时间', width: 120 },
    { field: 'description', headerName: '描述', flex: 1, minWidth: 180 },
    {
      headerName: '操作', width: 280, pinned: 'right' as const,
      cellRenderer: ({ data }: { data: TestCaseRow }) => (
        <Space size="small">
          <Button type="link" size="small" icon={<PlayCircleOutlined />} style={{ color: '#52c41a' }} onClick={() => handleExecute(data)}>执行</Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openModal(data)}>编辑</Button>
          <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => handleCopy(data)}>复制</Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(data)}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <h2 style={{ marginBottom: 16 }}>测试用例</h2>
      {/* 执行进度条 */}
      {executing && (
        <Progress percent={execProgress} status="active" style={{ marginBottom: 16 }} />
      )}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <Input.Search placeholder="搜索用例名称、描述..." value={searchText} onChange={(e) => setSearchText(e.target.value)} onSearch={(v) => setSearchText(v)} allowClear style={{ width: 280 }} />
        <Select mode="multiple" placeholder="所属模块" value={filterModules} onChange={setFilterModules} allowClear style={{ minWidth: 180 }} maxTagCount={2} options={MOCK_MODULES.map((m) => ({ value: m, label: m }))} />
        <Select placeholder="优先级" value={filterPriority} onChange={setFilterPriority} allowClear style={{ width: 120 }} options={PRIORITIES.map((p) => ({ value: p, label: p }))} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()} style={{ backgroundColor: '#eb2f96', borderColor: '#eb2f96' }}>添加测试用例</Button>
      </div>
      <div style={{ height: 600, width: '100%' }}>
        <AgGridReact<TestCaseRow> theme={gridTheme} rowData={filteredData} columnDefs={columnDefs} pagination={true} paginationPageSize={20} defaultColDef={{ sortable: true, resizable: true, filter: true }} localeText={{ noRowsToShow: '暂无数据' }} />
      </div>
      <Modal title={editingRow ? '编辑测试用例' : '添加测试用例'} open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)} okText="保存" cancelText="取消" destroyOnClose>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="caseName" label="用例名称" rules={[{ required: true, message: '请输入用例名称' }]}><Input placeholder="例如: 带宽测试-2.4G" /></Form.Item>
          <Form.Item name="moduleName" label="所属模块" rules={[{ required: true, message: '请选择所属模块' }]}><Select placeholder="请选择" options={MOCK_MODULES.map((m) => ({ value: m, label: m }))} /></Form.Item>
          <Form.Item name="priority" label="优先级" rules={[{ required: true, message: '请选择优先级' }]}><Select placeholder="请选择" options={PRIORITIES.map((p) => ({ value: p, label: p }))} /></Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}><Select placeholder="请选择" options={STATUSES.map((s) => ({ value: s, label: s }))} /></Form.Item>
          <Form.Item name="description" label="描述"><Input.TextArea rows={3} placeholder="测试用例描述..." /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TestCaseList;
