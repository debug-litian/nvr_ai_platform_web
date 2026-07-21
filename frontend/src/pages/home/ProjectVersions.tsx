import React, { useState, useMemo, useCallback } from 'react';
import { Button, Input, Select, Space, Modal, Form, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined, CopyOutlined, DeleteOutlined } from '@ant-design/icons';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import type { ColDef } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

interface VersionRow { id: number; version: string; moduleName: string; releaseDate: string; status: string; changeLog: string; }

const MOCK_MODULES = ['带宽测试', '光耦矫正', 'IPC蓝牙测试', '图像测试', 'IPC老化'];
const MOCK_DATA: VersionRow[] = [
  { id: 1, version: 'v1.2.0', moduleName: '带宽测试', releaseDate: '2025-06-01', status: '已发布', changeLog: '新增5G WiFi测试支持' },
  { id: 2, version: 'v1.2.1', moduleName: '光耦矫正', releaseDate: '2025-06-10', status: '已发布', changeLog: '修复光耦偏差值计算Bug' },
  { id: 3, version: 'v1.3.0-beta', moduleName: '图像测试', releaseDate: '2025-07-01', status: '测试中', changeLog: '新增清晰度评分算法v2' },
  { id: 4, version: 'v1.2.3', moduleName: 'IPC蓝牙测试', releaseDate: '2025-07-10', status: '已发布', changeLog: '蓝牙RSSI阈值可配置' },
  { id: 5, version: 'v1.4.0-dev', moduleName: 'IPC老化', releaseDate: '2025-07-16', status: '开发中', changeLog: '新增老化时长自定义' },
];

const ProjectVersions: React.FC = () => {
  const [rowData, setRowData] = useState<VersionRow[]>(MOCK_DATA);
  const [searchText, setSearchText] = useState('');
  const [filterModules, setFilterModules] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<VersionRow | null>(null);
  const [form] = Form.useForm();
  const [nextId, setNextId] = useState(6);

  const gridTheme = useMemo(() => themeQuartz.withParams({ accentColor: '#eb2f96' }), []);

  const filteredData = useMemo(() => {
    return rowData.filter((row) => {
      if (searchText && !row.version.toLowerCase().includes(searchText.toLowerCase()) && !row.changeLog.toLowerCase().includes(searchText.toLowerCase())) return false;
      if (filterModules.length > 0 && !filterModules.includes(row.moduleName)) return false;
      if (filterStatus && row.status !== filterStatus) return false;
      return true;
    });
  }, [rowData, searchText, filterModules, filterStatus]);

  const openModal = useCallback((row?: VersionRow) => {
    if (row) { setEditingRow(row); form.setFieldsValue(row); }
    else { setEditingRow(null); form.resetFields(); }
    setModalOpen(true);
  }, [form]);

  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields();
      if (editingRow) {
        setRowData((prev) => prev.map((r) => (r.id === editingRow.id ? { ...r, ...values } : r)));
        message.success('版本已更新');
      } else {
        setRowData((prev) => [...prev, { id: nextId, ...values, releaseDate: new Date().toISOString().slice(0, 10) }]);
        setNextId((id) => id + 1);
        message.success('版本已添加');
      }
      setModalOpen(false); form.resetFields();
    } catch { /* 校验失败 */ }
  }, [editingRow, form, nextId]);

  const handleCopy = useCallback((row: VersionRow) => {
    navigator.clipboard.writeText(`${row.version}\t${row.moduleName}\t${row.releaseDate}\t${row.status}\t${row.changeLog}`).then(() => message.success('已复制')).catch(() => message.error('复制失败'));
  }, []);

  const handleDelete = useCallback((row: VersionRow) => {
    Modal.confirm({
      title: '确认删除', content: `确定要删除版本 "${row.version}" 吗？`, okText: '删除', okType: 'danger', cancelText: '取消',
      onOk: () => { setRowData((prev) => prev.filter((r) => r.id !== row.id)); message.success('已删除'); },
    });
  }, []);

  const columnDefs: ColDef<VersionRow>[] = [
    { field: 'id', headerName: 'ID', width: 60 },
    { field: 'version', headerName: '版本号', width: 140 },
    { field: 'moduleName', headerName: '所属模块', width: 140 },
    { field: 'releaseDate', headerName: '发布日期', width: 120 },
    { field: 'status', headerName: '状态', width: 90, cellRenderer: ({ value }: { value: string }) => {
      const color = value === '已发布' ? 'success' : value === '测试中' ? 'processing' : 'default';
      return <Tag color={color}>{value}</Tag>;
    }},
    { field: 'changeLog', headerName: '更新日志', flex: 1, minWidth: 220 },
    {
      headerName: '操作', width: 200, pinned: 'right' as const,
      cellRenderer: ({ data }: { data: VersionRow }) => (
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
      <h2 style={{ marginBottom: 16 }}>版本迭代</h2>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <Input.Search placeholder="搜索版本号、更新日志..." value={searchText} onChange={(e) => setSearchText(e.target.value)} onSearch={(v) => setSearchText(v)} allowClear style={{ width: 280 }} />
        <Select mode="multiple" placeholder="所属模块" value={filterModules} onChange={setFilterModules} allowClear style={{ minWidth: 180 }} maxTagCount={2} options={MOCK_MODULES.map((m) => ({ value: m, label: m }))} />
        <Select placeholder="状态" value={filterStatus} onChange={setFilterStatus} allowClear style={{ width: 120 }} options={['已发布', '测试中', '开发中'].map((s) => ({ value: s, label: s }))} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()} style={{ backgroundColor: '#eb2f96', borderColor: '#eb2f96' }}>添加版本</Button>
      </div>
      <div style={{ height: 600, width: '100%' }}>
        <AgGridReact<VersionRow> theme={gridTheme} rowData={filteredData} columnDefs={columnDefs} pagination={true} paginationPageSize={20} defaultColDef={{ sortable: true, resizable: true, filter: true }} localeText={{ noRowsToShow: '暂无数据' }} />
      </div>
      <Modal title={editingRow ? '编辑版本' : '添加版本'} open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)} okText="保存" cancelText="取消" destroyOnClose>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="version" label="版本号" rules={[{ required: true, message: '请输入版本号' }]}><Input placeholder="v1.2.0" /></Form.Item>
          <Form.Item name="moduleName" label="所属模块" rules={[{ required: true, message: '请选择所属模块' }]}><Select placeholder="请选择" options={MOCK_MODULES.map((m) => ({ value: m, label: m }))} /></Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}><Select placeholder="请选择" options={['已发布', '测试中', '开发中'].map((s) => ({ value: s, label: s }))} /></Form.Item>
          <Form.Item name="changeLog" label="更新日志"><Input.TextArea rows={3} placeholder="更新日志..." /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProjectVersions;
