import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Button, Input, Select, Space, Modal, Form, message } from 'antd';
import { PlusOutlined, EditOutlined, CopyOutlined, DeleteOutlined, LinkOutlined } from '@ant-design/icons';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import type { ColDef } from 'ag-grid-community';
import { gridDefaultProps } from '../../utils/gridOptions';

// 注册 AG Grid 社区模块
ModuleRegistry.registerModules([AllCommunityModule]);

// ---- 类型定义 ----
/** 控件元素数据行 */
interface ControlRow {
  id: number;
  controlName: string;      // 控件名称
  moduleName: string;       // 模块名称
  locateType: string;       // 定位类型: input / select / slider / switch
  elementValue: string;     // 控件元素值
}

// ---- 模拟数据 ----
/** 模块列表（数据来源 /settings/modules） */
const MOCK_MODULES = [
  '带宽测试', '光耦矫正', 'IPC蓝牙测试', '中心偏差校准',
  '图像测试', 'IPC老化', '音频测试', '网络测试',
];

/** 初始列表数据 */
const MOCK_DATA: ControlRow[] = [
  { id: 1, controlName: '2.4G测试时间', moduleName: '带宽测试', locateType: 'input', elementValue: '30' },
  { id: 2, controlName: '5G测试时间', moduleName: '带宽测试', locateType: 'input', elementValue: '30' },
  { id: 3, controlName: '5G SSID', moduleName: '带宽测试', locateType: 'input', elementValue: 'Test_5G' },
  { id: 4, controlName: '光耦偏差值', moduleName: '光耦矫正', locateType: 'slider', elementValue: '0.5' },
  { id: 5, controlName: '蓝牙信号强度低', moduleName: 'IPC蓝牙测试', locateType: 'slider', elementValue: '-70' },
  { id: 6, controlName: '蓝牙信号强度高', moduleName: 'IPC蓝牙测试', locateType: 'slider', elementValue: '-30' },
  { id: 7, controlName: 'IR-CUT黑白阀值', moduleName: '图像测试', locateType: 'select', elementValue: '50' },
  { id: 8, controlName: 'IR-CUT彩色阀值', moduleName: '图像测试', locateType: 'select', elementValue: '200' },
  { id: 9, controlName: 'FTP服务器地址', moduleName: '图像测试', locateType: 'input', elementValue: '192.168.1.100' },
  { id: 10, controlName: '自动启动老化', moduleName: 'IPC老化', locateType: 'switch', elementValue: 'true' },
];

// ---- 定位类型选项 ----
const LOCATE_TYPES = ['input', 'select', 'slider', 'switch'];

const TestDataGeneral: React.FC = () => {
  // 列表数据
  const [rowData, setRowData] = useState<ControlRow[]>(MOCK_DATA);

  // 筛选状态
  const [searchText, setSearchText] = useState('');
  const [filterModules, setFilterModules] = useState<string[]>([]);
  const [filterLocateType, setFilterLocateType] = useState<string | undefined>(undefined);

  // 弹窗状态
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<ControlRow | null>(null);
  const [form] = Form.useForm();

  // 下一个 ID
  const [nextId, setNextId] = useState(11);

  // ---- AG Grid 主题（适配日夜模式） ----
  const gridTheme = useMemo(() => themeQuartz.withParams({ accentColor: '#eb2f96' }), []);

  // ---- 筛选逻辑 ----
  const filteredData = useMemo(() => {
    return rowData.filter((row) => {
      // 搜索框：匹配控件名称或控件元素值
      if (searchText) {
        const kw = searchText.toLowerCase();
        if (!row.controlName.toLowerCase().includes(kw) && !row.elementValue.toLowerCase().includes(kw)) {
          return false;
        }
      }
      // 模块名称多选筛选
      if (filterModules.length > 0 && !filterModules.includes(row.moduleName)) {
        return false;
      }
      // 定位类型单选筛选
      if (filterLocateType && row.locateType !== filterLocateType) {
        return false;
      }
      return true;
    });
  }, [rowData, searchText, filterModules, filterLocateType]);

  // ---- 打开添加/编辑弹窗 ----
  const openModal = useCallback((row?: ControlRow) => {
    if (row) {
      // 编辑模式：回显当前行数据
      setEditingRow(row);
      form.setFieldsValue(row);
    } else {
      // 添加模式：清空表单
      setEditingRow(null);
      form.resetFields();
    }
    setModalOpen(true);
  }, [form]);

  // ---- 确认保存 ----
  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields();
      if (editingRow) {
        // 编辑：更新现有行
        setRowData((prev) => prev.map((r) => (r.id === editingRow.id ? { ...r, ...values } : r)));
        message.success('控件元素已更新');
      } else {
        // 新增
        const newRow: ControlRow = { id: nextId, ...values };
        setRowData((prev) => [...prev, newRow]);
        setNextId((id) => id + 1);
        message.success('控件元素已添加');
      }
      setModalOpen(false);
      form.resetFields();
    } catch {
      // 表单校验失败，不做处理
    }
  }, [editingRow, form, nextId]);

  // ---- 复制到剪贴板 ----
  const handleCopy = useCallback((row: ControlRow) => {
    const text = `${row.controlName}\t${row.moduleName}\t${row.locateType}\t${row.elementValue}`;
    navigator.clipboard.writeText(text).then(() => {
      message.success('已复制到剪贴板');
    }).catch(() => {
      message.error('复制失败');
    });
  }, []);

  // ---- 删除 ----
  const handleDelete = useCallback((row: ControlRow) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除控件 "${row.controlName}" 吗？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        setRowData((prev) => prev.filter((r) => r.id !== row.id));
        message.success('已删除');
      },
    });
  }, []);

  // ---- AG Grid 列定义 ----
  const columnDefs: ColDef<ControlRow>[] = [
    { field: 'id', headerName: 'ID', width: 80, sortable: true },
    { field: 'controlName', headerName: '控件名称', width: 180, filter: true },
    { field: 'moduleName', headerName: '模块名称', width: 150, filter: true },
    { field: 'locateType', headerName: '定位类型', width: 120 },
    { field: 'elementValue', headerName: '控件元素值', width: 160 },
    {
      headerName: '操作',
      width: 250,
      pinned: 'right' as const,
      cellRenderer: ({ data }: { data: ControlRow }) => (
        <Space size="small">
          {/* 编辑按钮 */}
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openModal(data)}>
            编辑
          </Button>
          {/* 引用按钮（占位，暂延迟实现） */}
          <Button type="link" size="small" icon={<LinkOutlined />} disabled>
            引用
          </Button>
          {/* 复制按钮 */}
          <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => handleCopy(data)}>
            复制
          </Button>
          {/* 删除按钮 */}
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(data)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      {/* 页面标题 */}
      <h2 style={{ marginBottom: 16 }}>General_Setting</h2>

      {/* 筛选栏：搜索框 + 模块名称 + 定位类型 + 添加按钮 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* 搜索框 */}
        <Input.Search
          placeholder="搜索控件名称、控件元素值..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onSearch={(v) => setSearchText(v)}
          allowClear
          style={{ width: 280 }}
        />

        {/* 模块名称下拉多选 */}
        <Select
          mode="multiple"
          placeholder="模块名称"
          value={filterModules}
          onChange={setFilterModules}
          allowClear
          style={{ minWidth: 180, maxWidth: 300 }}
          maxTagCount={2}
          options={MOCK_MODULES.map((m) => ({ value: m, label: m }))}
        />

        {/* 定位类型下拉单选 */}
        <Select
          placeholder="定位类型"
          value={filterLocateType}
          onChange={setFilterLocateType}
          allowClear
          style={{ width: 140 }}
          options={LOCATE_TYPES.map((t) => ({ value: t, label: t }))}
        />

        {/* 添加控件元素（粉色按钮） */}
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => openModal()}
          style={{ backgroundColor: '#eb2f96', borderColor: '#eb2f96' }}
        >
          添加控件元素
        </Button>
      </div>

      {/* AG Grid 列表 */}
      <div style={{ height: 600, width: '100%' }}>
        <AgGridReact<ControlRow>
          theme={gridTheme}
          rowData={filteredData}
          columnDefs={columnDefs}
          {...gridDefaultProps}
        />
      </div>

      {/* 添加/编辑弹窗 */}
      <Modal
        title={editingRow ? '控件元素信息' : '添加控件元素'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        {/* 纵向表单布局 */}
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          {/* 控件名称 */}
          <Form.Item
            name="controlName"
            label="控件名称"
            rules={[{ required: true, message: '请输入控件名称' }]}
          >
            <Input placeholder="例如: 2.4G测试时间" />
          </Form.Item>

          {/* 定位类型 */}
          <Form.Item
            name="locateType"
            label="定位类型"
            rules={[{ required: true, message: '请选择定位类型' }]}
          >
            <Select
              placeholder="请选择定位类型"
              options={LOCATE_TYPES.map((t) => ({ value: t, label: t }))}
            />
          </Form.Item>

          {/* 控件元素值 */}
          <Form.Item
            name="elementValue"
            label="控件元素值"
            rules={[{ required: true, message: '请输入控件元素值' }]}
          >
            <Input placeholder="例如: 30" />
          </Form.Item>

          {/* 所属模块 */}
          <Form.Item
            name="moduleName"
            label="所属模块"
            rules={[{ required: true, message: '请选择所属模块' }]}
          >
            <Select
              placeholder="请选择所属模块"
              options={MOCK_MODULES.map((m) => ({ value: m, label: m }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TestDataGeneral;
