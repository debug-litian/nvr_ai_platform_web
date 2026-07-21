import React, { useState, useMemo, useCallback } from 'react';
import { Button, Input, Select, Space, Modal, Form, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined, CopyOutlined, DeleteOutlined } from '@ant-design/icons';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import type { ColDef } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

interface CrashRow { id: number; appVersion: string; platform: string; crashType: string; stackTrace: string; count: number; status: string; reportTime: string; }

const PLATFORMS = ['Android', 'iOS', 'Windows', 'Linux'];
const CRASH_TYPES = ['NullPointer', 'OutOfMemory', 'ANR', 'Signal', 'Other'];
const MOCK_DATA: CrashRow[] = [
  { id: 1, appVersion: 'v1.2.3', platform: 'Android', crashType: 'NullPointer', stackTrace: 'java.lang.NullPointerException at MainActivity.onCreate', count: 15, status: '未处理', reportTime: '2025-07-16 08:30' },
  { id: 2, appVersion: 'v1.2.3', platform: 'iOS', crashType: 'OutOfMemory', stackTrace: 'EXC_RESOURCE -> AppName[123] exceeded mem limit', count: 8, status: '处理中', reportTime: '2025-07-15 20:15' },
  { id: 3, appVersion: 'v1.3.0-beta', platform: 'Android', crashType: 'ANR', stackTrace: 'ANR in com.app.nvr: Broadcast of Intent', count: 3, status: '未处理', reportTime: '2025-07-16 09:00' },
  { id: 4, appVersion: 'v1.2.2', platform: 'Windows', crashType: 'Signal', stackTrace: 'SIGSEGV at 0x0040a3f8 in nvr_ai.dll', count: 5, status: '已修复', reportTime: '2025-07-14 11:00' },
  { id: 5, appVersion: 'v1.3.0-beta', platform: 'Linux', crashType: 'Other', stackTrace: 'segfault at 7f8a2c001000 ip 00007f8a2c001000', count: 2, status: '未处理', reportTime: '2025-07-16 10:30' },
];

const CICrash: React.FC = () => {
  const [rowData, setRowData] = useState<CrashRow[]>(MOCK_DATA);
  const [searchText, setSearchText] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<string | undefined>(undefined);
  const [filterType, setFilterType] = useState<string | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<CrashRow | null>(null);
  const [form] = Form.useForm();
  const [nextId, setNextId] = useState(6);

  const gridTheme = useMemo(() => themeQuartz.withParams({ accentColor: '#eb2f96' }), []);

  const filteredData = useMemo(() => {
    return rowData.filter((row) => {
      if (searchText && !row.appVersion.toLowerCase().includes(searchText.toLowerCase()) && !row.stackTrace.toLowerCase().includes(searchText.toLowerCase())) return false;
      if (filterPlatform && row.platform !== filterPlatform) return false;
      if (filterType && row.crashType !== filterType) return false;
      if (filterStatus && row.status !== filterStatus) return false;
      return true;
    });
  }, [rowData, searchText, filterPlatform, filterType, filterStatus]);

  const openModal = useCallback((row?: CrashRow) => {
    if (row) { setEditingRow(row); form.setFieldsValue(row); }
    else { setEditingRow(null); form.resetFields(); }
    setModalOpen(true);
  }, [form]);

  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields();
      if (editingRow) {
        setRowData((prev) => prev.map((r) => (r.id === editingRow.id ? { ...r, ...values } : r)));
        message.success('崩溃记录已更新');
      } else {
        setRowData((prev) => [...prev, { id: nextId, ...values, reportTime: new Date().toISOString().slice(0, 16).replace('T', ' ') }]);
        setNextId((id) => id + 1);
        message.success('崩溃记录已添加');
      }
      setModalOpen(false); form.resetFields();
    } catch { /* 校验失败 */ }
  }, [editingRow, form, nextId]);

  const handleCopy = useCallback((row: CrashRow) => {
    navigator.clipboard.writeText(`${row.appVersion}\t${row.platform}\t${row.crashType}\t${row.stackTrace}\t${row.count}`).then(() => message.success('已复制')).catch(() => message.error('复制失败'));
  }, []);

  const handleDelete = useCallback((row: CrashRow) => {
    Modal.confirm({
      title: '确认删除', content: `确定要删除崩溃记录吗？`, okText: '删除', okType: 'danger', cancelText: '取消',
      onOk: () => { setRowData((prev) => prev.filter((r) => r.id !== row.id)); message.success('已删除'); },
    });
  }, []);

  const columnDefs: ColDef<CrashRow>[] = [
    { field: 'id', headerName: 'ID', width: 60 },
    { field: 'appVersion', headerName: '版本', width: 120 },
    { field: 'platform', headerName: '平台', width: 90, cellRenderer: ({ value }: { value: string }) => <Tag>{value}</Tag> },
    { field: 'crashType', headerName: '崩溃类型', width: 130 },
    { field: 'stackTrace', headerName: '堆栈信息', flex: 1, minWidth: 250, cellStyle: { fontFamily: 'monospace', fontSize: 12 } },
    { field: 'count', headerName: '次数', width: 70 },
    { field: 'status', headerName: '状态', width: 90, cellRenderer: ({ value }: { value: string }) => {
      const color = value === '已修复' ? 'success' : value === '处理中' ? 'processing' : 'error';
      return <Tag color={color}>{value}</Tag>;
    }},
    { field: 'reportTime', headerName: '上报时间', width: 160 },
    {
      headerName: '操作', width: 200, pinned: 'right' as const,
      cellRenderer: ({ data }: { data: CrashRow }) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openModal(data)}>编辑</Button>
          <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => handleCopy(data)}>复制</Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(data)}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <h2 style={{ marginBottom: 16 }}>崩溃上报</h2>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <Input.Search placeholder="搜索版本、堆栈信息..." value={searchText} onChange={(e) => setSearchText(e.target.value)} onSearch={(v) => setSearchText(v)} allowClear style={{ width: 280 }} />
        <Select placeholder="平台" value={filterPlatform} onChange={setFilterPlatform} allowClear style={{ width: 120 }} options={PLATFORMS.map((p) => ({ value: p, label: p }))} />
        <Select placeholder="崩溃类型" value={filterType} onChange={setFilterType} allowClear style={{ width: 140 }} options={CRASH_TYPES.map((t) => ({ value: t, label: t }))} />
        <Select placeholder="状态" value={filterStatus} onChange={setFilterStatus} allowClear style={{ width: 120 }} options={['未处理', '处理中', '已修复'].map((s) => ({ value: s, label: s }))} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()} style={{ backgroundColor: '#eb2f96', borderColor: '#eb2f96' }}>添加上报记录</Button>
      </div>
      <div style={{ height: 600, width: '100%' }}>
        <AgGridReact<CrashRow> theme={gridTheme} rowData={filteredData} columnDefs={columnDefs} pagination={true} paginationPageSize={20} defaultColDef={{ sortable: true, resizable: true }} localeText={{ noRowsToShow: '暂无数据' }} />
      </div>
      <Modal title={editingRow ? '编辑崩溃记录' : '添加崩溃记录'} open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)} okText="保存" cancelText="取消" destroyOnClose>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="appVersion" label="版本" rules={[{ required: true, message: '请输入版本' }]}><Input placeholder="v1.2.3" /></Form.Item>
          <Form.Item name="platform" label="平台" rules={[{ required: true, message: '请选择平台' }]}><Select placeholder="请选择" options={PLATFORMS.map((p) => ({ value: p, label: p }))} /></Form.Item>
          <Form.Item name="crashType" label="崩溃类型" rules={[{ required: true, message: '请选择崩溃类型' }]}><Select placeholder="请选择" options={CRASH_TYPES.map((t) => ({ value: t, label: t }))} /></Form.Item>
          <Form.Item name="stackTrace" label="堆栈信息" rules={[{ required: true, message: '请输入堆栈信息' }]}><Input.TextArea rows={3} placeholder="堆栈信息..." /></Form.Item>
          <Form.Item name="count" label="崩溃次数" rules={[{ required: true, message: '请输入崩溃次数' }]}><Input type="number" placeholder="0" /></Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}><Select placeholder="请选择" options={['未处理', '处理中', '已修复'].map((s) => ({ value: s, label: s }))} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CICrash;
