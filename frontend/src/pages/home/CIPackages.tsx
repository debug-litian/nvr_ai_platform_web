import React, { useState, useMemo, useCallback } from 'react';
import { Button, Input, Select, Space, Modal, Form, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined, CopyOutlined, DeleteOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import type { ColDef } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

interface PackageRow { id: number; packageName: string; version: string; platform: string; size: string; status: string; uploadTime: string; }

const PLATFORMS = ['Android', 'iOS', 'Windows', 'Linux'];
const MOCK_DATA: PackageRow[] = [
  { id: 1, packageName: 'NVR_AI_Platform', version: 'v1.2.3', platform: 'Android', size: '45.2 MB', status: '已发布', uploadTime: '2025-07-15 14:30' },
  { id: 2, packageName: 'NVR_AI_Platform', version: 'v1.2.2', platform: 'iOS', size: '52.1 MB', status: '已发布', uploadTime: '2025-07-10 10:00' },
  { id: 3, packageName: 'NVR_AI_Platform', version: 'v1.3.0-beta', platform: 'Android', size: '48.7 MB', status: '测试中', uploadTime: '2025-07-16 08:00' },
  { id: 4, packageName: 'NVR_AI_Platform', version: 'v1.2.3', platform: 'Windows', size: '78.3 MB', status: '已发布', uploadTime: '2025-07-14 16:00' },
  { id: 5, packageName: 'NVR_AI_Platform', version: 'v1.3.0-beta', platform: 'Linux', size: '65.8 MB', status: '测试中', uploadTime: '2025-07-16 09:00' },
];

const CIPackages: React.FC = () => {
  const [rowData, setRowData] = useState<PackageRow[]>(MOCK_DATA);
  const [searchText, setSearchText] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<string | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<PackageRow | null>(null);
  const [form] = Form.useForm();
  const [nextId, setNextId] = useState(6);

  const gridTheme = useMemo(() => themeQuartz.withParams({ accentColor: '#eb2f96' }), []);

  const filteredData = useMemo(() => {
    return rowData.filter((row) => {
      if (searchText && !row.packageName.toLowerCase().includes(searchText.toLowerCase()) && !row.version.toLowerCase().includes(searchText.toLowerCase())) return false;
      if (filterPlatform && row.platform !== filterPlatform) return false;
      if (filterStatus && row.status !== filterStatus) return false;
      return true;
    });
  }, [rowData, searchText, filterPlatform, filterStatus]);

  const openModal = useCallback((row?: PackageRow) => {
    if (row) { setEditingRow(row); form.setFieldsValue(row); }
    else { setEditingRow(null); form.resetFields(); }
    setModalOpen(true);
  }, [form]);

  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields();
      if (editingRow) {
        setRowData((prev) => prev.map((r) => (r.id === editingRow.id ? { ...r, ...values } : r)));
        message.success('安装包已更新');
      } else {
        setRowData((prev) => [...prev, { id: nextId, ...values, uploadTime: new Date().toISOString().slice(0, 16).replace('T', ' ') }]);
        setNextId((id) => id + 1);
        message.success('安装包已添加');
      }
      setModalOpen(false); form.resetFields();
    } catch { /* 校验失败 */ }
  }, [editingRow, form, nextId]);

  const handleCopy = useCallback((row: PackageRow) => {
    navigator.clipboard.writeText(`${row.packageName}\t${row.version}\t${row.platform}\t${row.size}\t${row.status}`).then(() => message.success('已复制')).catch(() => message.error('复制失败'));
  }, []);

  const handleDelete = useCallback((row: PackageRow) => {
    Modal.confirm({
      title: '确认删除', content: `确定要删除安装包 "${row.packageName} ${row.version}" 吗？`, okText: '删除', okType: 'danger', cancelText: '取消',
      onOk: () => { setRowData((prev) => prev.filter((r) => r.id !== row.id)); message.success('已删除'); },
    });
  }, []);

  const columnDefs: ColDef<PackageRow>[] = [
    { field: 'id', headerName: 'ID', width: 60 },
    { field: 'packageName', headerName: '包名', width: 180 },
    { field: 'version', headerName: '版本', width: 130 },
    { field: 'platform', headerName: '平台', width: 100, cellRenderer: ({ value }: { value: string }) => <Tag>{value}</Tag> },
    { field: 'size', headerName: '大小', width: 100 },
    { field: 'status', headerName: '状态', width: 100, cellRenderer: ({ value }: { value: string }) => <Tag color={value === '已发布' ? 'success' : 'processing'}>{value}</Tag> },
    { field: 'uploadTime', headerName: '上传时间', width: 160 },
    {
      headerName: '操作', width: 250, pinned: 'right' as const,
      cellRenderer: ({ data }: { data: PackageRow }) => (
        <Space size="small">
          <Button type="link" size="small" icon={<PlayCircleOutlined />}>安装</Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openModal(data)}>编辑</Button>
          <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => handleCopy(data)}>复制</Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(data)}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <h2 style={{ marginBottom: 16 }}>安装包管理</h2>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <Input.Search placeholder="搜索包名、版本..." value={searchText} onChange={(e) => setSearchText(e.target.value)} onSearch={(v) => setSearchText(v)} allowClear style={{ width: 280 }} />
        <Select placeholder="平台" value={filterPlatform} onChange={setFilterPlatform} allowClear style={{ width: 140 }} options={PLATFORMS.map((p) => ({ value: p, label: p }))} />
        <Select placeholder="状态" value={filterStatus} onChange={setFilterStatus} allowClear style={{ width: 120 }} options={['已发布', '测试中'].map((s) => ({ value: s, label: s }))} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()} style={{ backgroundColor: '#eb2f96', borderColor: '#eb2f96' }}>添加安装包</Button>
      </div>
      <div style={{ height: 600, width: '100%' }}>
        <AgGridReact<PackageRow> theme={gridTheme} rowData={filteredData} columnDefs={columnDefs} pagination={true} paginationPageSize={20} defaultColDef={{ sortable: true, resizable: true, filter: true }} localeText={{ noRowsToShow: '暂无数据' }} />
      </div>
      <Modal title={editingRow ? '编辑安装包' : '添加安装包'} open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)} okText="保存" cancelText="取消" destroyOnClose>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="packageName" label="包名" rules={[{ required: true, message: '请输入包名' }]}><Input placeholder="例如: NVR_AI_Platform" /></Form.Item>
          <Form.Item name="version" label="版本" rules={[{ required: true, message: '请输入版本' }]}><Input placeholder="v1.2.3" /></Form.Item>
          <Form.Item name="platform" label="平台" rules={[{ required: true, message: '请选择平台' }]}><Select placeholder="请选择" options={PLATFORMS.map((p) => ({ value: p, label: p }))} /></Form.Item>
          <Form.Item name="size" label="大小" rules={[{ required: true, message: '请输入大小' }]}><Input placeholder="45.2 MB" /></Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}><Select placeholder="请选择" options={['已发布', '测试中'].map((s) => ({ value: s, label: s }))} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CIPackages;
