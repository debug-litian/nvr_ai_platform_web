import React, { useState, useMemo, useCallback } from 'react';
import { Button, Input, Select, Space, Modal, Form, message } from 'antd';
import { PlusOutlined, EditOutlined, CopyOutlined, DeleteOutlined } from '@ant-design/icons';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import type { ColDef } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

interface StepRow { id: number; stepName: string; moduleName: string; stepOrder: number; description: string; }

const MOCK_MODULES = ['带宽测试', '光耦矫正', 'IPC蓝牙测试', '图像测试', 'IPC老化'];
const MOCK_DATA: StepRow[] = [
  { id: 1, stepName: '连接WiFi网络', moduleName: '带宽测试', stepOrder: 1, description: '设备连接到2.4G WiFi网络' },
  { id: 2, stepName: '启动带宽测试', moduleName: '带宽测试', stepOrder: 2, description: '开始发送/接收数据包' },
  { id: 3, stepName: '校准光耦传感器', moduleName: '光耦矫正', stepOrder: 1, description: '使用标准光源进行背光校准' },
  { id: 4, stepName: '开启蓝牙扫描', moduleName: 'IPC蓝牙测试', stepOrder: 1, description: '启动设备蓝牙模块扫描周边信号' },
  { id: 5, stepName: '录制测试视频', moduleName: '图像测试', stepOrder: 1, description: '录制30秒测试视频用于清晰度分析' },
  { id: 6, stepName: '抓拍测试图片', moduleName: '图像测试', stepOrder: 2, description: '使用IR-CUT切换后抓拍图片' },
];

const TestDataSteps: React.FC = () => {
  const [rowData, setRowData] = useState<StepRow[]>(MOCK_DATA);
  const [searchText, setSearchText] = useState('');
  const [filterModules, setFilterModules] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<StepRow | null>(null);
  const [form] = Form.useForm();
  const [nextId, setNextId] = useState(7);

  const gridTheme = useMemo(() => themeQuartz.withParams({ accentColor: '#eb2f96' }), []);

  const filteredData = useMemo(() => {
    return rowData.filter((row) => {
      if (searchText && !row.stepName.toLowerCase().includes(searchText.toLowerCase()) && !row.description.toLowerCase().includes(searchText.toLowerCase())) return false;
      if (filterModules.length > 0 && !filterModules.includes(row.moduleName)) return false;
      return true;
    });
  }, [rowData, searchText, filterModules]);

  const openModal = useCallback((row?: StepRow) => {
    if (row) { setEditingRow(row); form.setFieldsValue(row); }
    else { setEditingRow(null); form.resetFields(); }
    setModalOpen(true);
  }, [form]);

  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields();
      if (editingRow) {
        setRowData((prev) => prev.map((r) => (r.id === editingRow.id ? { ...r, ...values } : r)));
        message.success('公共步骤已更新');
      } else {
        setRowData((prev) => [...prev, { id: nextId, ...values }]);
        setNextId((id) => id + 1);
        message.success('公共步骤已添加');
      }
      setModalOpen(false); form.resetFields();
    } catch { /* 校验失败 */ }
  }, [editingRow, form, nextId]);

  const handleCopy = useCallback((row: StepRow) => {
    navigator.clipboard.writeText(`${row.stepName}\t${row.moduleName}\t${row.stepOrder}\t${row.description}`).then(() => message.success('已复制')).catch(() => message.error('复制失败'));
  }, []);

  const handleDelete = useCallback((row: StepRow) => {
    Modal.confirm({
      title: '确认删除', content: `确定要删除公共步骤 "${row.stepName}" 吗？`, okText: '删除', okType: 'danger', cancelText: '取消',
      onOk: () => { setRowData((prev) => prev.filter((r) => r.id !== row.id)); message.success('已删除'); },
    });
  }, []);

  const columnDefs: ColDef<StepRow>[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'stepName', headerName: '步骤名称', width: 200 },
    { field: 'moduleName', headerName: '所属模块', width: 140 },
    { field: 'stepOrder', headerName: '执行顺序', width: 100 },
    { field: 'description', headerName: '描述', flex: 1, minWidth: 200 },
    {
      headerName: '操作', width: 200, pinned: 'right' as const,
      cellRenderer: ({ data }: { data: StepRow }) => (
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
      <h2 style={{ marginBottom: 16 }}>公共步骤</h2>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <Input.Search placeholder="搜索步骤名称、描述..." value={searchText} onChange={(e) => setSearchText(e.target.value)} onSearch={(v) => setSearchText(v)} allowClear style={{ width: 280 }} />
        <Select mode="multiple" placeholder="所属模块" value={filterModules} onChange={setFilterModules} allowClear style={{ minWidth: 180 }} maxTagCount={2} options={MOCK_MODULES.map((m) => ({ value: m, label: m }))} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()} style={{ backgroundColor: '#eb2f96', borderColor: '#eb2f96' }}>添加公共步骤</Button>
      </div>
      <div style={{ height: 600, width: '100%' }}>
        <AgGridReact<StepRow> theme={gridTheme} rowData={filteredData} columnDefs={columnDefs} pagination={true} paginationPageSize={20} defaultColDef={{ sortable: true, resizable: true, filter: true }} localeText={{ noRowsToShow: '暂无数据' }} />
      </div>
      <Modal title={editingRow ? '编辑公共步骤' : '添加公共步骤'} open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)} okText="保存" cancelText="取消" destroyOnClose>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="stepName" label="步骤名称" rules={[{ required: true, message: '请输入步骤名称' }]}><Input placeholder="例如: 连接WiFi网络" /></Form.Item>
          <Form.Item name="moduleName" label="所属模块" rules={[{ required: true, message: '请选择所属模块' }]}><Select placeholder="请选择" options={MOCK_MODULES.map((m) => ({ value: m, label: m }))} /></Form.Item>
          <Form.Item name="stepOrder" label="执行顺序" rules={[{ required: true, message: '请输入执行顺序' }]}><Input type="number" placeholder="1" /></Form.Item>
          <Form.Item name="description" label="描述"><Input.TextArea rows={3} placeholder="步骤描述..." /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TestDataSteps;
