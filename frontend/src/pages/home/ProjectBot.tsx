import React, { useState, useMemo, useCallback } from 'react';
import { Button, Input, Select, Space, Modal, Form, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined, CopyOutlined, DeleteOutlined } from '@ant-design/icons';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import type { ColDef } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

interface BotRow { id: number; botName: string; botType: string; webhookUrl: string; status: string; createTime: string; }

const BOT_TYPES = ['钉钉', '飞书', '企业微信', 'Slack', 'Telegram'];
const MOCK_DATA: BotRow[] = [
  { id: 1, botName: '测试结果通知-钉钉', botType: '钉钉', webhookUrl: 'https://oapi.dingtalk.com/robot/send?access_token=xxx', status: '启用', createTime: '2025-03-01' },
  { id: 2, botName: '告警通知-飞书', botType: '飞书', webhookUrl: 'https://open.feishu.cn/open-apis/bot/v2/hook/xxx', status: '启用', createTime: '2025-03-15' },
  { id: 3, botName: 'CI构建通知-企业微信', botType: '企业微信', webhookUrl: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx', status: '禁用', createTime: '2025-04-01' },
  { id: 4, botName: '崩溃上报通知-Slack', botType: 'Slack', webhookUrl: 'https://hooks.slack.com/services/xxx', status: '启用', createTime: '2025-05-10' },
];

const ProjectBot: React.FC = () => {
  const [rowData, setRowData] = useState<BotRow[]>(MOCK_DATA);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<string | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<BotRow | null>(null);
  const [form] = Form.useForm();
  const [nextId, setNextId] = useState(5);

  const gridTheme = useMemo(() => themeQuartz.withParams({ accentColor: '#eb2f96' }), []);

  const filteredData = useMemo(() => {
    return rowData.filter((row) => {
      if (searchText && !row.botName.toLowerCase().includes(searchText.toLowerCase())) return false;
      if (filterType && row.botType !== filterType) return false;
      if (filterStatus && row.status !== filterStatus) return false;
      return true;
    });
  }, [rowData, searchText, filterType, filterStatus]);

  const openModal = useCallback((row?: BotRow) => {
    if (row) { setEditingRow(row); form.setFieldsValue(row); }
    else { setEditingRow(null); form.resetFields(); }
    setModalOpen(true);
  }, [form]);

  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields();
      if (editingRow) {
        setRowData((prev) => prev.map((r) => (r.id === editingRow.id ? { ...r, ...values } : r)));
        message.success('通知机器人已更新');
      } else {
        setRowData((prev) => [...prev, { id: nextId, ...values, createTime: new Date().toISOString().slice(0, 10) }]);
        setNextId((id) => id + 1);
        message.success('通知机器人已添加');
      }
      setModalOpen(false); form.resetFields();
    } catch { /* 校验失败 */ }
  }, [editingRow, form, nextId]);

  const handleCopy = useCallback((row: BotRow) => {
    navigator.clipboard.writeText(`${row.botName}\t${row.botType}\t${row.webhookUrl}\t${row.status}`).then(() => message.success('已复制')).catch(() => message.error('复制失败'));
  }, []);

  const handleDelete = useCallback((row: BotRow) => {
    Modal.confirm({
      title: '确认删除', content: `确定要删除通知机器人 "${row.botName}" 吗？`, okText: '删除', okType: 'danger', cancelText: '取消',
      onOk: () => { setRowData((prev) => prev.filter((r) => r.id !== row.id)); message.success('已删除'); },
    });
  }, []);

  const columnDefs: ColDef<BotRow>[] = [
    { field: 'id', headerName: 'ID', width: 60 },
    { field: 'botName', headerName: '机器人名称', width: 220 },
    { field: 'botType', headerName: '平台', width: 120, cellRenderer: ({ value }: { value: string }) => <Tag>{value}</Tag> },
    { field: 'webhookUrl', headerName: 'Webhook URL', flex: 1, minWidth: 280, cellStyle: { fontFamily: 'monospace', fontSize: 12 } },
    { field: 'status', headerName: '状态', width: 80, cellRenderer: ({ value }: { value: string }) => <Tag color={value === '启用' ? 'success' : 'default'}>{value}</Tag> },
    { field: 'createTime', headerName: '创建时间', width: 120 },
    {
      headerName: '操作', width: 200, pinned: 'right' as const,
      cellRenderer: ({ data }: { data: BotRow }) => (
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
      <h2 style={{ marginBottom: 16 }}>通知机器人</h2>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <Input.Search placeholder="搜索机器人名称..." value={searchText} onChange={(e) => setSearchText(e.target.value)} onSearch={(v) => setSearchText(v)} allowClear style={{ width: 280 }} />
        <Select placeholder="平台" value={filterType} onChange={setFilterType} allowClear style={{ width: 140 }} options={BOT_TYPES.map((t) => ({ value: t, label: t }))} />
        <Select placeholder="状态" value={filterStatus} onChange={setFilterStatus} allowClear style={{ width: 120 }} options={['启用', '禁用'].map((s) => ({ value: s, label: s }))} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()} style={{ backgroundColor: '#eb2f96', borderColor: '#eb2f96' }}>添加机器人</Button>
      </div>
      <div style={{ height: 600, width: '100%' }}>
        <AgGridReact<BotRow> theme={gridTheme} rowData={filteredData} columnDefs={columnDefs} pagination={true} paginationPageSize={20} defaultColDef={{ sortable: true, resizable: true, filter: true }} localeText={{ noRowsToShow: '暂无数据' }} />
      </div>
      <Modal title={editingRow ? '编辑通知机器人' : '添加通知机器人'} open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)} okText="保存" cancelText="取消" destroyOnClose>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="botName" label="机器人名称" rules={[{ required: true, message: '请输入机器人名称' }]}><Input placeholder="例如: 测试结果通知-钉钉" /></Form.Item>
          <Form.Item name="botType" label="平台" rules={[{ required: true, message: '请选择平台' }]}><Select placeholder="请选择" options={BOT_TYPES.map((t) => ({ value: t, label: t }))} /></Form.Item>
          <Form.Item name="webhookUrl" label="Webhook URL" rules={[{ required: true, message: '请输入Webhook URL' }]}><Input placeholder="https://..." /></Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}><Select placeholder="请选择" options={['启用', '禁用'].map((s) => ({ value: s, label: s }))} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProjectBot;
