import React, { useState, useMemo, useCallback } from 'react';
import { Button, Input, Select, Space, Modal, Form, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined, CopyOutlined, DeleteOutlined } from '@ant-design/icons';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import type { ColDef } from 'ag-grid-community';
import { gridDefaultProps } from '../../utils/gridOptions';

ModuleRegistry.registerModules([AllCommunityModule]);

interface ModuleRow { id: number; moduleName: string; description: string; protocols: string; status: string; }

const PROTOCOL_OPTIONS = ['HTTP','ONVIF','RTSP','FTP','SMTP','SNMP','DHCP','SIP','SMB','NFS','GPIO','UPnP','AWS','Azure'];

const MOCK_DATA: ModuleRow[] = [
  { id: 1, moduleName:'Home_Alarm', description:'报警与AI检测', protocols:'HTTP/ONVIF', status:'启用' },
  { id: 2, moduleName:'Home_Surveillance', description:'录像与报警联动', protocols:'FTP/SMTP', status:'启用' },
  { id: 3, moduleName:'Home_Display', description:'图像显示与OSD', protocols:'RTSP/ONVIF', status:'启用' },
  { id: 4, moduleName:'Home_System', description:'系统配置与信息', protocols:'HTTP/SNMP', status:'启用' },
  { id: 5, moduleName:'Home_Net', description:'网络配置', protocols:'HTTP/DHCP', status:'启用' },
  { id: 6, moduleName:'Home_Audio', description:'音频与门铃', protocols:'RTSP/SIP', status:'禁用' },
  { id: 7, moduleName:'Home_Ptz', description:'云台控制', protocols:'ONVIF', status:'启用' },
  { id: 8, moduleName:'Home_Storage', description:'存储管理', protocols:'SMB/NFS', status:'启用' },
  { id: 9, moduleName:'Home_Light', description:'灯光控制', protocols:'GPIO/ONVIF', status:'禁用' },
  { id:10, moduleName:'Home_Timelapse', description:'延时摄影', protocols:'HTTP', status:'启用' },
  { id:11, moduleName:'Home_Cloud', description:'云服务', protocols:'AWS/Azure', status:'启用' },
  { id:12, moduleName:'Home_Device', description:'设备管理', protocols:'HTTP/UPnP', status:'启用' },
];

const ProjectModules: React.FC = () => {
  const [rowData, setRowData] = useState<ModuleRow[]>(MOCK_DATA);
  const [searchText, setSearchText] = useState('');
  const [filterProtocol, setFilterProtocol] = useState<string|undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<string|undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<ModuleRow|null>(null);
  const [form] = Form.useForm();
  const [nextId, setNextId] = useState(13);

  const gridTheme = useMemo(() => themeQuartz.withParams({ accentColor: '#eb2f96' }), []);

  const filteredData = useMemo(() => rowData.filter((row) => {
    if (searchText) { const kw = searchText.toLowerCase(); if (!row.moduleName.toLowerCase().includes(kw) && !row.description.includes(kw)) return false; }
    if (filterProtocol && !row.protocols.includes(filterProtocol)) return false;
    if (filterStatus && row.status !== filterStatus) return false;
    return true;
  }), [rowData, searchText, filterProtocol, filterStatus]);

  const openModal = useCallback((row?: ModuleRow) => {
    if (row) { setEditingRow(row); form.setFieldsValue(row); }
    else { setEditingRow(null); form.resetFields(); }
    setModalOpen(true);
  }, [form]);

  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields();
      if (editingRow) { setRowData((p) => p.map((r) => r.id === editingRow.id ? { ...r, ...values } : r)); message.success('已更新'); }
      else { setRowData((p) => [...p, { id: nextId, ...values }]); setNextId((id) => id + 1); message.success('已添加'); }
      setModalOpen(false); form.resetFields();
    } catch { /* */ }
  }, [editingRow, form, nextId]);

  const handleCopy = useCallback((row: ModuleRow) => {
    navigator.clipboard.writeText(`${row.moduleName}\t${row.description}\t${row.protocols}\t${row.status}`).then(() => message.success('已复制')).catch(() => message.error('复制失败'));
  }, []);

  const handleDelete = useCallback((row: ModuleRow) => {
    Modal.confirm({ title:'确认删除', content:`确定删除 "${row.moduleName}"？`, okText:'删除', okType:'danger', cancelText:'取消', onOk:()=>{ setRowData((p)=>p.filter((r)=>r.id!==row.id)); message.success('已删除'); }});
  }, []);

  const columnDefs: ColDef<ModuleRow>[] = [
    { field:'id', headerName:'ID', width:70 },
    { field:'moduleName', headerName:'模块名称', width:180 },
    { field:'description', headerName:'模块描述', width:160 },
    { field:'protocols', headerName:'关联协议', width:180, cellRenderer:({value}:{value:string}) => value.split('/').map((p:string) => <Tag key={p} color="blue" style={{marginBottom:2}}>{p}</Tag>) },
    { field:'status', headerName:'状态', width:80, cellRenderer:({value}:{value:string}) => <Tag color={value==='启用'?'success':'default'}>{value}</Tag> },
    { headerName:'操作', width:200, pinned:'right', cellRenderer:({data}:{data:ModuleRow}) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined/>} onClick={()=>openModal(data)}>编辑</Button>
          <Button type="link" size="small" icon={<CopyOutlined/>} onClick={()=>handleCopy(data)}>复制</Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined/>} onClick={()=>handleDelete(data)}>删除</Button>
        </Space>
      )},
  ];

  return (
    <div className="page-container">
      <h2 style={{marginBottom:16}}>模块管理</h2>
      <div style={{display:'flex', gap:12, marginBottom:16, alignItems:'center', flexWrap:'wrap'}}>
        <Input.Search placeholder="搜索模块名称、描述..." value={searchText} onChange={e=>setSearchText(e.target.value)} onSearch={v=>setSearchText(v)} allowClear style={{width:280}}/>
        <Select placeholder="关联协议" value={filterProtocol} onChange={setFilterProtocol} allowClear style={{width:160}} options={PROTOCOL_OPTIONS.map(p=>({value:p,label:p}))}/>
        <Select placeholder="状态" value={filterStatus} onChange={setFilterStatus} allowClear style={{width:120}} options={['启用','禁用'].map(s=>({value:s,label:s}))}/>
        <Button type="primary" icon={<PlusOutlined/>} onClick={()=>openModal()} style={{backgroundColor:'#eb2f96',borderColor:'#eb2f96'}}>添加模块</Button>
      </div>
      <div style={{height:600,width:'100%'}}>
        <AgGridReact<ModuleRow> theme={gridTheme} rowData={filteredData} columnDefs={columnDefs} {...gridDefaultProps}/>
      </div>
      <Modal title={editingRow?'编辑模块':'添加模块'} open={modalOpen} onOk={handleSave} onCancel={()=>setModalOpen(false)} okText="保存" cancelText="取消" destroyOnClose>
        <Form form={form} layout="vertical" style={{marginTop:16}}>
          <Form.Item name="moduleName" label="模块名称" rules={[{required:true,message:'请输入模块名称'}]}><Input placeholder="Home_Alarm"/></Form.Item>
          <Form.Item name="description" label="模块描述" rules={[{required:true,message:'请输入模块描述'}]}><Input placeholder="报警与AI检测"/></Form.Item>
          <Form.Item name="protocols" label="关联协议" rules={[{required:true,message:'请选择关联协议'}]}>
            <Select mode="multiple" placeholder="选择关联协议（可多选）" options={PROTOCOL_OPTIONS.map(p=>({value:p,label:p}))}/>
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{required:true,message:'请选择状态'}]}><Select placeholder="请选择" options={['启用','禁用'].map(s=>({value:s,label:s}))}/></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProjectModules;
