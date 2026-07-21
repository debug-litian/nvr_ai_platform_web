import React, { useState, useMemo, useCallback } from 'react';
import { Button, Input, Select, Space, Modal, Form, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined, CopyOutlined, DeleteOutlined, LinkOutlined } from '@ant-design/icons';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import type { ColDef } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

interface DeviceRow {
  id: number;
  deviceName: string;
  ip: string;
  port: number;
  channelCount: number;
  status: string;
  lastOnline: string;
}

const MOCK_DATA: DeviceRow[] = [
  { id: 1, deviceName: 'NVR-RLN16-410', ip: '192.168.124.2', port: 80, channelCount: 16, status: '在线', lastOnline: '2025-07-16 14:30' },
  { id: 2, deviceName: 'NVR-RLN8-410', ip: '192.168.124.10', port: 80, channelCount: 8, status: '在线', lastOnline: '2025-07-16 14:28' },
  { id: 3, deviceName: 'IPC-Bullet-C1', ip: '192.168.124.20', port: 554, channelCount: 1, status: '离线', lastOnline: '2025-07-15 08:00' },
  { id: 4, deviceName: 'IPC-Dome-D1', ip: '192.168.124.21', port: 554, channelCount: 1, status: '在线', lastOnline: '2025-07-16 14:25' },
  { id: 5, deviceName: 'IPC-PTZ-P1', ip: '192.168.124.22', port: 554, channelCount: 1, status: '告警', lastOnline: '2025-07-16 14:20' },
  { id: 6, deviceName: 'NVR-RLN16-820', ip: '192.168.124.30', port: 80, channelCount: 16, status: '在线', lastOnline: '2025-07-16 14:32' },
  { id: 7, deviceName: 'IPC-Fisheye-F1', ip: '192.168.124.40', port: 554, channelCount: 1, status: '离线', lastOnline: '2025-07-14 18:00' },
  { id: 8, deviceName: 'NVR-RLN4-210', ip: '192.168.124.50', port: 80, channelCount: 4, status: '在线', lastOnline: '2025-07-16 14:31' },
];

const STATUSES = ['在线', '离线', '告警'];

const DeviceList: React.FC = () => {
  const [rowData, setRowData] = useState<DeviceRow[]>(MOCK_DATA);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<DeviceRow | null>(null);
  const [form] = Form.useForm();
  const [nextId, setNextId] = useState(9);

  const gridTheme = useMemo(() => themeQuartz.withParams({ accentColor: '#eb2f96' }), []);

  const filteredData = useMemo(() => {
    return rowData.filter((row) => {
      if (searchText && !row.deviceName.toLowerCase().includes(searchText.toLowerCase()) && !row.ip.includes(searchText)) return false;
      if (filterStatus && row.status !== filterStatus) return false;
      return true;
    });
  }, [rowData, searchText, filterStatus]);

  const openModal = useCallback((row?: DeviceRow) => {
    if (row) { setEditingRow(row); form.setFieldsValue(row); }
    else { setEditingRow(null); form.resetFields(); }
    setModalOpen(true);
  }, [form]);

  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields();
      if (editingRow) {
        setRowData((prev) => prev.map((r) => (r.id === editingRow.id ? { ...r, ...values } : r)));
        message.success('设备已更新');
      } else {
        setRowData((prev) => [...prev, { id: nextId, ...values, lastOnline: '-', status: '在线' }]);
        setNextId((id) => id + 1);
        message.success('设备已添加');
      }
      setModalOpen(false); form.resetFields();
    } catch { /* 校验失败 */ }
  }, [editingRow, form, nextId]);

  const handleCopy = useCallback((row: DeviceRow) => {
    navigator.clipboard.writeText(`${row.deviceName}\t${row.ip}:${row.port}\t${row.channelCount}\t${row.status}`).then(() => message.success('已复制')).catch(() => message.error('复制失败'));
  }, []);

  const handleDelete = useCallback((row: DeviceRow) => {
    Modal.confirm({
      title: '确认删除', content: `确定要删除设备 "${row.deviceName}" 吗？`, okText: '删除', okType: 'danger', cancelText: '取消',
      onOk: () => { setRowData((prev) => prev.filter((r) => r.id !== row.id)); message.success('已删除'); },
    });
  }, []);

  const columnDefs: ColDef<DeviceRow>[] = [
    { field: 'id', headerName: 'ID', width: 60 },
    { field: 'deviceName', headerName: '设备名', width: 200 },
    { field: 'ip', headerName: 'IP', width: 150 },
    { field: 'port', headerName: '端口', width: 80 },
    { field: 'channelCount', headerName: '通道数', width: 90 },
    {
      field: 'status', headerName: '状态', width: 90,
      cellRenderer: ({ value }: { value: string }) => {
        const color = value === '在线' ? 'success' : value === '离线' ? 'error' : 'warning';
        return <Tag color={color}>{value}</Tag>;
      },
    },
    { field: 'lastOnline', headerName: '最后在线', width: 160 },
    {
      headerName: '操作', width: 200, pinned: 'right' as const,
      cellRenderer: ({ data }: { data: DeviceRow }) => (
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
      <h2 style={{ marginBottom: 16 }}>设备列表</h2>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <Input.Search placeholder="搜索设备名、IP..." value={searchText} onChange={(e) => setSearchText(e.target.value)} onSearch={(v) => setSearchText(v)} allowClear style={{ width: 280 }} />
        <Select placeholder="状态" value={filterStatus} onChange={setFilterStatus} allowClear style={{ width: 120 }} options={STATUSES.map((s) => ({ value: s, label: s }))} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()} style={{ backgroundColor: '#eb2f96', borderColor: '#eb2f96' }}>添加设备</Button>
      </div>
      <div style={{ height: 600, width: '100%' }}>
        <AgGridReact<DeviceRow> theme={gridTheme} rowData={filteredData} columnDefs={columnDefs} pagination={true} paginationPageSize={20} defaultColDef={{ sortable: true, resizable: true, filter: true }} localeText={{ noRowsToShow: '暂无数据' }} />
      </div>
      <Modal title={editingRow ? '编辑设备' : '添加设备'} open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)} okText="保存" cancelText="取消" destroyOnClose>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="deviceName" label="设备名" rules={[{ required: true, message: '请输入设备名' }]}><Input placeholder="例如: NVR-RLN16-410" /></Form.Item>
          <Form.Item name="ip" label="IP 地址" rules={[{ required: true, message: '请输入IP地址' }]}><Input placeholder="192.168.124.2" /></Form.Item>
          <Form.Item name="port" label="端口" rules={[{ required: true, message: '请输入端口' }]}><Input placeholder="80" /></Form.Item>
          <Form.Item name="channelCount" label="通道数" rules={[{ required: true, message: '请输入通道数' }]}><Input type="number" placeholder="16" /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DeviceList;
