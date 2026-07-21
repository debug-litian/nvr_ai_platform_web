import React, { useState, useMemo, useCallback } from 'react';
import { Button, Input, Select, Space, Modal, Form, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined, CopyOutlined, DeleteOutlined } from '@ant-design/icons';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import type { ColDef } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

interface SettingRow { id: number; settingKey: string; settingValue: string; settingType: string; description: string; }

const SETTING_TYPES = ['String', 'Number', 'Boolean', 'JSON'];
const MOCK_DATA: SettingRow[] = [
  { id: 1, settingKey: 'ftp_server_host', settingValue: '192.168.124.1', settingType: 'String', description: 'FTP服务器地址' },
  { id: 2, settingKey: 'ftp_server_port', settingValue: '21', settingType: 'Number', description: 'FTP服务器端口' },
  { id: 3, settingKey: 'rtsp_auto_reconnect', settingValue: 'true', settingType: 'Boolean', description: 'RTSP断线自动重连' },
  { id: 4, settingKey: 'yolo_confidence_threshold', settingValue: '0.25', settingType: 'Number', description: 'YOLO检测置信度阈值' },
  { id: 5, settingKey: 'alarm_notification', settingValue: '{"email":true,"sms":false}', settingType: 'JSON', description: '告警通知配置' },
  { id: 6, settingKey: 'video_retention_days', settingValue: '30', settingType: 'Number', description: '录像保留天数' },
];

const ProjectSettings: React.FC = () => {
  const [rowData, setRowData] = useState<SettingRow[]>(MOCK_DATA);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<string | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<SettingRow | null>(null);
  const [form] = Form.useForm();
  const [nextId, setNextId] = useState(7);

  const gridTheme = useMemo(() => themeQuartz.withParams({ accentColor: '#eb2f96' }), []);

  const filteredData = useMemo(() => {
    return rowData.filter((row) => {
      if (searchText && !row.settingKey.toLowerCase().includes(searchText.toLowerCase()) && !row.description.toLowerCase().includes(searchText.toLowerCase())) return false;
      if (filterType && row.settingType !== filterType) return false;
      return true;
    });
  }, [rowData, searchText, filterType]);

  const openModal = useCallback((row?: SettingRow) => {
    if (row) { setEditingRow(row); form.setFieldsValue(row); }
    else { setEditingRow(null); form.resetFields(); }
    setModalOpen(true);
  }, [form]);

  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields();
      if (editingRow) {
        setRowData((prev) => prev.map((r) => (r.id === editingRow.id ? { ...r, ...values } : r)));
        message.success('设置已更新');
      } else {
        setRowData((prev) => [...prev, { id: nextId, ...values }]);
        setNextId((id) => id + 1);
        message.success('设置已添加');
      }
      setModalOpen(false); form.resetFields();
    } catch { /* 校验失败 */ }
  }, [editingRow, form, nextId]);

  const handleCopy = useCallback((row: SettingRow) => {
    navigator.clipboard.writeText(`${row.settingKey}\t${row.settingValue}\t${row.settingType}\t${row.description}`).then(() => message.success('已复制')).catch(() => message.error('复制失败'));
  }, []);

  const handleDelete = useCallback((row: SettingRow) => {
    Modal.confirm({
      title: '确认删除', content: `确定要删除设置 "${row.settingKey}" 吗？`, okText: '删除', okType: 'danger', cancelText: '取消',
      onOk: () => { setRowData((prev) => prev.filter((r) => r.id !== row.id)); message.success('已删除'); },
    });
  }, []);

  const columnDefs: ColDef<SettingRow>[] = [
    { field: 'id', headerName: 'ID', width: 60 },
    { field: 'settingKey', headerName: '配置项', width: 220 },
    { field: 'settingValue', headerName: '配置值', width: 200 },
    { field: 'settingType', headerName: '类型', width: 100, cellRenderer: ({ value }: { value: string }) => <Tag>{value}</Tag> },
    { field: 'description', headerName: '描述', flex: 1, minWidth: 200 },
    {
      headerName: '操作', width: 200, pinned: 'right' as const,
      cellRenderer: ({ data }: { data: SettingRow }) => (
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
      <h2 style={{ marginBottom: 16 }}>项目设置</h2>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <Input.Search placeholder="搜索配置项、描述..." value={searchText} onChange={(e) => setSearchText(e.target.value)} onSearch={(v) => setSearchText(v)} allowClear style={{ width: 280 }} />
        <Select placeholder="类型" value={filterType} onChange={setFilterType} allowClear style={{ width: 140 }} options={SETTING_TYPES.map((t) => ({ value: t, label: t }))} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()} style={{ backgroundColor: '#eb2f96', borderColor: '#eb2f96' }}>添加配置项</Button>
      </div>
      <div style={{ height: 600, width: '100%' }}>
        <AgGridReact<SettingRow> theme={gridTheme} rowData={filteredData} columnDefs={columnDefs} pagination={true} paginationPageSize={20} defaultColDef={{ sortable: true, resizable: true, filter: true }} localeText={{ noRowsToShow: '暂无数据' }} />
      </div>
      <Modal title={editingRow ? '编辑配置项' : '添加配置项'} open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)} okText="保存" cancelText="取消" destroyOnClose>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="settingKey" label="配置项" rules={[{ required: true, message: '请输入配置项名称' }]}><Input placeholder="例如: ftp_server_host" /></Form.Item>
          <Form.Item name="settingValue" label="配置值" rules={[{ required: true, message: '请输入配置值' }]}><Input placeholder="例如: 192.168.1.1" /></Form.Item>
          <Form.Item name="settingType" label="类型" rules={[{ required: true, message: '请选择类型' }]}><Select placeholder="请选择" options={SETTING_TYPES.map((t) => ({ value: t, label: t }))} /></Form.Item>
          <Form.Item name="description" label="描述"><Input.TextArea rows={2} placeholder="配置项说明..." /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProjectSettings;
