import React, { useState, useMemo, useCallback } from 'react';
import { Button, Input, Select, Space, Modal, Form, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined, CopyOutlined, DeleteOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import type { ColDef } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

interface SuiteRow { id: number; suiteName: string; moduleName: string; caseCount: number; status: string; createTime: string; }

const MOCK_MODULES = ['带宽测试', '光耦矫正', 'IPC蓝牙测试', '图像测试', 'IPC老化'];
const STATUSES = ['执行中', '已完成', '待执行'];

const MOCK_DATA: SuiteRow[] = [
  { id: 1, suiteName: 'WiFi带宽测试套件', moduleName: '带宽测试', caseCount: 5, status: '执行中', createTime: '2025-01-20' },
  { id: 2, suiteName: '光耦校准套件', moduleName: '光耦矫正', caseCount: 3, status: '已完成', createTime: '2025-02-01' },
  { id: 3, suiteName: '蓝牙全功能套件', moduleName: 'IPC蓝牙测试', caseCount: 8, status: '待执行', createTime: '2025-02-15' },
  { id: 4, suiteName: '图像质量套件', moduleName: '图像测试', caseCount: 12, status: '执行中', createTime: '2025-03-10' },
  { id: 5, suiteName: '老化测试套件', moduleName: 'IPC老化', caseCount: 2, status: '已完成', createTime: '2025-04-05' },
];

const TestCaseSuites: React.FC = () => {
  const [rowData, setRowData] = useState<SuiteRow[]>(MOCK_DATA);
  const [searchText, setSearchText] = useState('');
  const [filterModules, setFilterModules] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<SuiteRow | null>(null);
  const [form] = Form.useForm();
  const [nextId, setNextId] = useState(6);

  const gridTheme = useMemo(() => themeQuartz.withParams({ accentColor: '#eb2f96' }), []);

  const filteredData = useMemo(() => {
    return rowData.filter((row) => {
      if (searchText && !row.suiteName.toLowerCase().includes(searchText.toLowerCase())) return false;
      if (filterModules.length > 0 && !filterModules.includes(row.moduleName)) return false;
      if (filterStatus && row.status !== filterStatus) return false;
      return true;
    });
  }, [rowData, searchText, filterModules, filterStatus]);

  const openModal = useCallback((row?: SuiteRow) => {
    if (row) { setEditingRow(row); form.setFieldsValue(row); }
    else { setEditingRow(null); form.resetFields(); }
    setModalOpen(true);
  }, [form]);

  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields();
      if (editingRow) {
        setRowData((prev) => prev.map((r) => (r.id === editingRow.id ? { ...r, ...values } : r)));
        message.success('测试套件已更新');
      } else {
        setRowData((prev) => [...prev, { id: nextId, ...values, caseCount: 0, createTime: new Date().toISOString().slice(0, 10) }]);
        setNextId((id) => id + 1);
        message.success('测试套件已添加');
      }
      setModalOpen(false); form.resetFields();
    } catch { /* 校验失败 */ }
  }, [editingRow, form, nextId]);

  const handleCopy = useCallback((row: SuiteRow) => {
    navigator.clipboard.writeText(`${row.suiteName}\t${row.moduleName}\t${row.caseCount}\t${row.status}`).then(() => message.success('已复制')).catch(() => message.error('复制失败'));
  }, []);

  const handleDelete = useCallback((row: SuiteRow) => {
    Modal.confirm({
      title: '确认删除', content: `确定要删除测试套件 "${row.suiteName}" 吗？`, okText: '删除', okType: 'danger', cancelText: '取消',
      onOk: () => { setRowData((prev) => prev.filter((r) => r.id !== row.id)); message.success('已删除'); },
    });
  }, []);

  const columnDefs: ColDef<SuiteRow>[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'suiteName', headerName: '套件名称', width: 200 },
    { field: 'moduleName', headerName: '所属模块', width: 140 },
    { field: 'caseCount', headerName: '用例数', width: 90 },
    {
      field: 'status', headerName: '状态', width: 100,
      cellRenderer: ({ value }: { value: string }) => {
        const color = value === '执行中' ? 'processing' : value === '已完成' ? 'success' : 'default';
        return <Tag color={color}>{value}</Tag>;
      },
    },
    { field: 'createTime', headerName: '创建时间', width: 120 },
    {
      headerName: '操作', width: 260, pinned: 'right' as const,
      cellRenderer: ({ data }: { data: SuiteRow }) => (
        <Space size="small">
          <Button type="link" size="small" icon={<PlayCircleOutlined />}>执行</Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openModal(data)}>编辑</Button>
          <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => handleCopy(data)}>复制</Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(data)}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <h2 style={{ marginBottom: 16 }}>测试套件</h2>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <Input.Search placeholder="搜索套件名称..." value={searchText} onChange={(e) => setSearchText(e.target.value)} onSearch={(v) => setSearchText(v)} allowClear style={{ width: 280 }} />
        <Select mode="multiple" placeholder="所属模块" value={filterModules} onChange={setFilterModules} allowClear style={{ minWidth: 180 }} maxTagCount={2} options={MOCK_MODULES.map((m) => ({ value: m, label: m }))} />
        <Select placeholder="状态" value={filterStatus} onChange={setFilterStatus} allowClear style={{ width: 120 }} options={STATUSES.map((s) => ({ value: s, label: s }))} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()} style={{ backgroundColor: '#eb2f96', borderColor: '#eb2f96' }}>添加测试套件</Button>
      </div>
      <div style={{ height: 600, width: '100%' }}>
        <AgGridReact<SuiteRow> theme={gridTheme} rowData={filteredData} columnDefs={columnDefs} pagination={true} paginationPageSize={20} defaultColDef={{ sortable: true, resizable: true, filter: true }} localeText={{ noRowsToShow: '暂无数据' }} />
      </div>
      <Modal title={editingRow ? '编辑测试套件' : '添加测试套件'} open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)} okText="保存" cancelText="取消" destroyOnClose>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="suiteName" label="套件名称" rules={[{ required: true, message: '请输入套件名称' }]}><Input placeholder="例如: WiFi带宽测试套件" /></Form.Item>
          <Form.Item name="moduleName" label="所属模块" rules={[{ required: true, message: '请选择所属模块' }]}><Select placeholder="请选择" options={MOCK_MODULES.map((m) => ({ value: m, label: m }))} /></Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}><Select placeholder="请选择" options={STATUSES.map((s) => ({ value: s, label: s }))} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TestCaseSuites;
