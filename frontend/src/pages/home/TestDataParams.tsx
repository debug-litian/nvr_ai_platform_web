import React, { useState, useMemo, useCallback } from 'react';
import { Button, Input, Select, Space, Modal, Form, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined, CopyOutlined, DeleteOutlined } from '@ant-design/icons';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import type { ColDef } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

interface ParamRow { id: number; paramName: string; paramValue: string; paramType: string; moduleName: string; description: string; }

const MOCK_MODULES = ['带宽测试', '光耦矫正', 'IPC蓝牙测试', '图像测试', 'IPC老化'];
const PARAM_TYPES = ['String', 'Number', 'Boolean', 'JSON'];

const MOCK_DATA: ParamRow[] = [
  { id: 1, paramName: '2.4G_TEST_DURATION', paramValue: '30', paramType: 'Number', moduleName: '带宽测试', description: '2.4G WiFi测试时长(秒)' },
  { id: 2, paramName: '5G_SSID', paramValue: 'Test_5G', paramType: 'String', moduleName: '带宽测试', description: '5G WiFi SSID' },
  { id: 3, paramName: 'BLUETOOTH_RSSI_LOW', paramValue: '-70', paramType: 'Number', moduleName: 'IPC蓝牙测试', description: '蓝牙信号强度低阈值' },
  { id: 4, paramName: 'BLUETOOTH_RSSI_HIGH', paramValue: '-30', paramType: 'Number', moduleName: 'IPC蓝牙测试', description: '蓝牙信号强度高阈值' },
  { id: 5, paramName: 'IRCUT_BW_THRESHOLD', paramValue: '50', paramType: 'Number', moduleName: '图像测试', description: 'IR-CUT黑白切换阀值' },
  { id: 6, paramName: 'FTP_SERVER_ADDR', paramValue: '192.168.1.100', paramType: 'String', moduleName: '图像测试', description: 'FTP服务器地址' },
  { id: 7, paramName: 'AGING_AUTO_START', paramValue: 'true', paramType: 'Boolean', moduleName: 'IPC老化', description: '是否自动启动老化' },
];

const TestDataParams: React.FC = () => {
  const [rowData, setRowData] = useState<ParamRow[]>(MOCK_DATA);
  const [searchText, setSearchText] = useState('');
  const [filterModules, setFilterModules] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<ParamRow | null>(null);
  const [form] = Form.useForm();
  const [nextId, setNextId] = useState(8);

  const gridTheme = useMemo(() => themeQuartz.withParams({ accentColor: '#eb2f96' }), []);

  const filteredData = useMemo(() => {
    return rowData.filter((row) => {
      if (searchText && !row.paramName.toLowerCase().includes(searchText.toLowerCase()) && !row.paramValue.includes(searchText) && !row.description.toLowerCase().includes(searchText.toLowerCase())) return false;
      if (filterModules.length > 0 && !filterModules.includes(row.moduleName)) return false;
      if (filterType && row.paramType !== filterType) return false;
      return true;
    });
  }, [rowData, searchText, filterModules, filterType]);

  const openModal = useCallback((row?: ParamRow) => {
    if (row) { setEditingRow(row); form.setFieldsValue(row); }
    else { setEditingRow(null); form.resetFields(); }
    setModalOpen(true);
  }, [form]);

  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields();
      if (editingRow) {
        setRowData((prev) => prev.map((r) => (r.id === editingRow.id ? { ...r, ...values } : r)));
        message.success('全局参数已更新');
      } else {
        setRowData((prev) => [...prev, { id: nextId, ...values }]);
        setNextId((id) => id + 1);
        message.success('全局参数已添加');
      }
      setModalOpen(false); form.resetFields();
    } catch { /* 校验失败 */ }
  }, [editingRow, form, nextId]);

  const handleCopy = useCallback((row: ParamRow) => {
    navigator.clipboard.writeText(`${row.paramName}\t${row.paramValue}\t${row.paramType}\t${row.moduleName}\t${row.description}`).then(() => message.success('已复制')).catch(() => message.error('复制失败'));
  }, []);

  const handleDelete = useCallback((row: ParamRow) => {
    Modal.confirm({
      title: '确认删除', content: `确定要删除全局参数 "${row.paramName}" 吗？`, okText: '删除', okType: 'danger', cancelText: '取消',
      onOk: () => { setRowData((prev) => prev.filter((r) => r.id !== row.id)); message.success('已删除'); },
    });
  }, []);

  const columnDefs: ColDef<ParamRow>[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'paramName', headerName: '参数名', width: 200 },
    { field: 'paramValue', headerName: '参数值', width: 150 },
    { field: 'paramType', headerName: '类型', width: 100, cellRenderer: ({ value }: { value: string }) => <Tag>{value}</Tag> },
    { field: 'moduleName', headerName: '所属模块', width: 140 },
    { field: 'description', headerName: '描述', flex: 1, minWidth: 200 },
    {
      headerName: '操作', width: 200, pinned: 'right' as const,
      cellRenderer: ({ data }: { data: ParamRow }) => (
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
      <h2 style={{ marginBottom: 16 }}>全局参数</h2>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <Input.Search placeholder="搜索参数名、参数值、描述..." value={searchText} onChange={(e) => setSearchText(e.target.value)} onSearch={(v) => setSearchText(v)} allowClear style={{ width: 280 }} />
        <Select mode="multiple" placeholder="所属模块" value={filterModules} onChange={setFilterModules} allowClear style={{ minWidth: 180 }} maxTagCount={2} options={MOCK_MODULES.map((m) => ({ value: m, label: m }))} />
        <Select placeholder="参数类型" value={filterType} onChange={setFilterType} allowClear style={{ width: 140 }} options={PARAM_TYPES.map((t) => ({ value: t, label: t }))} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()} style={{ backgroundColor: '#eb2f96', borderColor: '#eb2f96' }}>添加全局参数</Button>
      </div>
      <div style={{ height: 600, width: '100%' }}>
        <AgGridReact<ParamRow> theme={gridTheme} rowData={filteredData} columnDefs={columnDefs} pagination={true} paginationPageSize={20} defaultColDef={{ sortable: true, resizable: true, filter: true }} localeText={{ noRowsToShow: '暂无数据' }} />
      </div>
      <Modal title={editingRow ? '编辑全局参数' : '添加全局参数'} open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)} okText="保存" cancelText="取消" destroyOnClose>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="paramName" label="参数名" rules={[{ required: true, message: '请输入参数名' }]}><Input placeholder="例如: 2.4G_TEST_DURATION" /></Form.Item>
          <Form.Item name="paramValue" label="参数值" rules={[{ required: true, message: '请输入参数值' }]}><Input placeholder="例如: 30" /></Form.Item>
          <Form.Item name="paramType" label="参数类型" rules={[{ required: true, message: '请选择参数类型' }]}><Select placeholder="请选择" options={PARAM_TYPES.map((t) => ({ value: t, label: t }))} /></Form.Item>
          <Form.Item name="moduleName" label="所属模块" rules={[{ required: true, message: '请选择所属模块' }]}><Select placeholder="请选择" options={MOCK_MODULES.map((m) => ({ value: m, label: m }))} /></Form.Item>
          <Form.Item name="description" label="描述"><Input.TextArea rows={2} placeholder="参数说明..." /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TestDataParams;
