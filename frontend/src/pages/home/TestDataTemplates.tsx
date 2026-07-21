import React, { useState, useMemo, useCallback } from 'react';
import { Button, Input, Select, Space, Modal, Form, message } from 'antd';
import { PlusOutlined, EditOutlined, CopyOutlined, DeleteOutlined } from '@ant-design/icons';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import type { ColDef } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

interface TemplateRow { id: number; templateName: string; moduleName: string; scriptLanguage: string; content: string; }

const MOCK_MODULES = ['带宽测试', '光耦矫正', 'IPC蓝牙测试', '图像测试', 'IPC老化'];
const LANGUAGES = ['Python', 'Shell', 'JavaScript'];

const MOCK_DATA: TemplateRow[] = [
  { id: 1, templateName: '带宽测试-发送脚本', moduleName: '带宽测试', scriptLanguage: 'Python', content: 'iperf3 -c {target} -t {duration}' },
  { id: 2, templateName: '光耦校准脚本', moduleName: '光耦矫正', scriptLanguage: 'Python', content: 'calibrate_sensor(offset={value})' },
  { id: 3, templateName: '蓝牙扫描脚本', moduleName: 'IPC蓝牙测试', scriptLanguage: 'Shell', content: 'hcitool scan' },
  { id: 4, templateName: '图像抓拍脚本', moduleName: '图像测试', scriptLanguage: 'Python', content: 'capture_image(channel={ch}, format="jpg")' },
  { id: 5, templateName: '老化监控脚本', moduleName: 'IPC老化', scriptLanguage: 'JavaScript', content: 'startAging(duration=3600)' },
];

const TestDataTemplates: React.FC = () => {
  const [rowData, setRowData] = useState<TemplateRow[]>(MOCK_DATA);
  const [searchText, setSearchText] = useState('');
  const [filterModules, setFilterModules] = useState<string[]>([]);
  const [filterLanguage, setFilterLanguage] = useState<string | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<TemplateRow | null>(null);
  const [form] = Form.useForm();
  const [nextId, setNextId] = useState(6);

  const gridTheme = useMemo(() => themeQuartz.withParams({ accentColor: '#eb2f96' }), []);

  const filteredData = useMemo(() => {
    return rowData.filter((row) => {
      if (searchText && !row.templateName.toLowerCase().includes(searchText.toLowerCase()) && !row.content.toLowerCase().includes(searchText.toLowerCase())) return false;
      if (filterModules.length > 0 && !filterModules.includes(row.moduleName)) return false;
      if (filterLanguage && row.scriptLanguage !== filterLanguage) return false;
      return true;
    });
  }, [rowData, searchText, filterModules, filterLanguage]);

  const openModal = useCallback((row?: TemplateRow) => {
    if (row) { setEditingRow(row); form.setFieldsValue(row); }
    else { setEditingRow(null); form.resetFields(); }
    setModalOpen(true);
  }, [form]);

  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields();
      if (editingRow) {
        setRowData((prev) => prev.map((r) => (r.id === editingRow.id ? { ...r, ...values } : r)));
        message.success('脚本模板已更新');
      } else {
        setRowData((prev) => [...prev, { id: nextId, ...values }]);
        setNextId((id) => id + 1);
        message.success('脚本模板已添加');
      }
      setModalOpen(false); form.resetFields();
    } catch { /* 校验失败 */ }
  }, [editingRow, form, nextId]);

  const handleCopy = useCallback((row: TemplateRow) => {
    navigator.clipboard.writeText(`${row.templateName}\t${row.moduleName}\t${row.scriptLanguage}\t${row.content}`).then(() => message.success('已复制')).catch(() => message.error('复制失败'));
  }, []);

  const handleDelete = useCallback((row: TemplateRow) => {
    Modal.confirm({
      title: '确认删除', content: `确定要删除脚本模板 "${row.templateName}" 吗？`, okText: '删除', okType: 'danger', cancelText: '取消',
      onOk: () => { setRowData((prev) => prev.filter((r) => r.id !== row.id)); message.success('已删除'); },
    });
  }, []);

  const columnDefs: ColDef<TemplateRow>[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'templateName', headerName: '模板名称', width: 200 },
    { field: 'moduleName', headerName: '所属模块', width: 140 },
    { field: 'scriptLanguage', headerName: '脚本语言', width: 120 },
    { field: 'content', headerName: '脚本内容', flex: 1, minWidth: 250 },
    {
      headerName: '操作', width: 200, pinned: 'right' as const,
      cellRenderer: ({ data }: { data: TemplateRow }) => (
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
      <h2 style={{ marginBottom: 16 }}>脚本模板</h2>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <Input.Search placeholder="搜索模板名称、脚本内容..." value={searchText} onChange={(e) => setSearchText(e.target.value)} onSearch={(v) => setSearchText(v)} allowClear style={{ width: 280 }} />
        <Select mode="multiple" placeholder="所属模块" value={filterModules} onChange={setFilterModules} allowClear style={{ minWidth: 180 }} maxTagCount={2} options={MOCK_MODULES.map((m) => ({ value: m, label: m }))} />
        <Select placeholder="脚本语言" value={filterLanguage} onChange={setFilterLanguage} allowClear style={{ width: 140 }} options={LANGUAGES.map((l) => ({ value: l, label: l }))} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()} style={{ backgroundColor: '#eb2f96', borderColor: '#eb2f96' }}>添加脚本模板</Button>
      </div>
      <div style={{ height: 600, width: '100%' }}>
        <AgGridReact<TemplateRow> theme={gridTheme} rowData={filteredData} columnDefs={columnDefs} pagination={true} paginationPageSize={20} defaultColDef={{ sortable: true, resizable: true, filter: true }} localeText={{ noRowsToShow: '暂无数据' }} />
      </div>
      <Modal title={editingRow ? '编辑脚本模板' : '添加脚本模板'} open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)} okText="保存" cancelText="取消" destroyOnClose>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="templateName" label="模板名称" rules={[{ required: true, message: '请输入模板名称' }]}><Input placeholder="例如: 带宽测试-发送脚本" /></Form.Item>
          <Form.Item name="moduleName" label="所属模块" rules={[{ required: true, message: '请选择所属模块' }]}><Select placeholder="请选择" options={MOCK_MODULES.map((m) => ({ value: m, label: m }))} /></Form.Item>
          <Form.Item name="scriptLanguage" label="脚本语言" rules={[{ required: true, message: '请选择脚本语言' }]}><Select placeholder="请选择" options={LANGUAGES.map((l) => ({ value: l, label: l }))} /></Form.Item>
          <Form.Item name="content" label="脚本内容" rules={[{ required: true, message: '请输入脚本内容' }]}><Input.TextArea rows={4} placeholder="脚本代码..." /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TestDataTemplates;
