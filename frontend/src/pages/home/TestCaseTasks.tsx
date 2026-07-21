import React, { useState, useMemo, useCallback } from 'react';
import { Button, Input, Select, Space, Modal, Form, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined, CopyOutlined, DeleteOutlined } from '@ant-design/icons';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import type { ColDef } from 'ag-grid-community';
import { gridDefaultProps } from '../../utils/gridOptions';

ModuleRegistry.registerModules([AllCommunityModule]);

interface TaskRow { id: number; taskName: string; moduleName: string; cron: string; status: string; lastRun: string; }

const MOCK_MODULES = ['带宽测试','光耦矫正','IPC蓝牙测试','图像测试','IPC老化'];
const MOCK_DATA: TaskRow[] = [
  { id:1, taskName:'每日带宽测试', moduleName:'带宽测试', cron:'0 9 * * *', status:'启用', lastRun:'2025-07-16 09:00' },
  { id:2, taskName:'光耦周检', moduleName:'光耦矫正', cron:'0 10 * * 1', status:'启用', lastRun:'2025-07-14 10:00' },
  { id:3, taskName:'蓝牙月测', moduleName:'IPC蓝牙测试', cron:'0 8 1 * *', status:'禁用', lastRun:'2025-07-01 08:00' },
  { id:4, taskName:'图像质量日报', moduleName:'图像测试', cron:'0 18 * * *', status:'启用', lastRun:'2025-07-16 18:00' },
];

const TestCaseTasks: React.FC = () => {
  const [rowData, setRowData] = useState<TaskRow[]>(MOCK_DATA);
  const [searchText, setSearchText] = useState('');
  const [filterModules, setFilterModules] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string|undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<TaskRow|null>(null);
  const [form] = Form.useForm();
  const [nextId, setNextId] = useState(5);

  const gridTheme = useMemo(() => themeQuartz.withParams({accentColor:'#eb2f96'}), []);

  const filteredData = useMemo(() => rowData.filter((row) => {
    if (searchText && !row.taskName.toLowerCase().includes(searchText.toLowerCase())) return false;
    if (filterModules.length>0 && !filterModules.includes(row.moduleName)) return false;
    if (filterStatus && row.status !== filterStatus) return false;
    return true;
  }), [rowData, searchText, filterModules, filterStatus]);

  const openModal = useCallback((row?: TaskRow) => {
    if (row) { setEditingRow(row); form.setFieldsValue(row); }
    else { setEditingRow(null); form.resetFields(); }
    setModalOpen(true);
  }, [form]);

  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields();
      if (editingRow) { setRowData((p) => p.map((r) => r.id === editingRow.id ? { ...r, ...values } : r)); message.success('已更新'); }
      else { setRowData((p) => [...p, { id: nextId, ...values, lastRun:'-' }]); setNextId((id) => id + 1); message.success('已添加'); }
      setModalOpen(false); form.resetFields();
    } catch { /* */ }
  }, [editingRow, form, nextId]);

  const handleCopy = useCallback((row: TaskRow) => {
    navigator.clipboard.writeText(`${row.taskName}\t${row.moduleName}\t${row.cron}\t${row.status}`).then(() => message.success('已复制')).catch(() => message.error('复制失败'));
  }, []);

  const handleDelete = useCallback((row: TaskRow) => {
    Modal.confirm({ title:'确认删除', content:`确定删除 "${row.taskName}"？`, okText:'删除', okType:'danger', cancelText:'取消', onOk:()=>{ setRowData((p)=>p.filter((r)=>r.id!==row.id)); message.success('已删除'); }});
  }, []);

  const columnDefs: ColDef<TaskRow>[] = [
    { field:'id', headerName:'ID', width:70 },
    { field:'taskName', headerName:'任务名称', width:200 },
    { field:'moduleName', headerName:'所属模块', width:140 },
    { field:'cron', headerName:'Cron表达式', width:150 },
    { field:'status', headerName:'状态', width:80, cellRenderer:({value}:{value:string}) => <Tag color={value==='启用'?'success':'default'}>{value}</Tag> },
    { field:'lastRun', headerName:'上次运行', width:160 },
    { headerName:'操作', width:200, pinned:'right', cellRenderer:({data}:{data:TaskRow}) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined/>} onClick={()=>openModal(data)}>编辑</Button>
          <Button type="link" size="small" icon={<CopyOutlined/>} onClick={()=>handleCopy(data)}>复制</Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined/>} onClick={()=>handleDelete(data)}>删除</Button>
        </Space>
      )},
  ];

  return (
    <div className="page-container">
      <h2 style={{marginBottom:16}}>定时任务</h2>
      <div style={{display:'flex', gap:12, marginBottom:16, alignItems:'center', flexWrap:'wrap'}}>
        <Input.Search placeholder="搜索任务名称..." value={searchText} onChange={e=>setSearchText(e.target.value)} onSearch={v=>setSearchText(v)} allowClear style={{width:280}}/>
        <Select mode="multiple" placeholder="所属模块" value={filterModules} onChange={setFilterModules} allowClear style={{minWidth:180}} maxTagCount={2} options={MOCK_MODULES.map(m=>({value:m,label:m}))}/>
        <Select placeholder="状态" value={filterStatus} onChange={setFilterStatus} allowClear style={{width:120}} options={['启用','禁用'].map(s=>({value:s,label:s}))}/>
        <Button type="primary" icon={<PlusOutlined/>} onClick={()=>openModal()} style={{backgroundColor:'#eb2f96',borderColor:'#eb2f96'}}>添加定时任务</Button>
      </div>
      <div style={{height:600,width:'100%'}}>
        <AgGridReact<TaskRow> theme={gridTheme} rowData={filteredData} columnDefs={columnDefs} {...gridDefaultProps}/>
      </div>
      <Modal title={editingRow?'编辑定时任务':'添加定时任务'} open={modalOpen} onOk={handleSave} onCancel={()=>setModalOpen(false)} okText="保存" cancelText="取消" destroyOnClose>
        <Form form={form} layout="vertical" style={{marginTop:16}}>
          <Form.Item name="taskName" label="任务名称" rules={[{required:true}]}><Input placeholder="每日带宽测试"/></Form.Item>
          <Form.Item name="moduleName" label="所属模块" rules={[{required:true}]}><Select placeholder="请选择" options={MOCK_MODULES.map(m=>({value:m,label:m}))}/></Form.Item>
          <Form.Item name="cron" label="Cron表达式" rules={[{required:true}]}><Input placeholder="0 9 * * *"/></Form.Item>
          <Form.Item name="status" label="状态" rules={[{required:true}]}><Select placeholder="请选择" options={['启用','禁用'].map(s=>({value:s,label:s}))}/></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TestCaseTasks;
