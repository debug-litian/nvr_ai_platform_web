import React, { useState, useMemo, useCallback } from 'react';
import { Button, Input, Select, Space, Modal, Form, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined, CopyOutlined, DeleteOutlined, BarChartOutlined } from '@ant-design/icons';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import type { ColDef } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

interface VersionOverviewRow { id: number; version: string; moduleName: string; totalCases: number; passCount: number; failCount: number; passRate: number; status: string; }

const MOCK_MODULES = ['带宽测试', '光耦矫正', 'IPC蓝牙测试', '图像测试', 'IPC老化'];
const MOCK_DATA: VersionOverviewRow[] = [
  { id: 1, version: 'v1.2.3', moduleName: '带宽测试', totalCases: 20, passCount: 19, failCount: 1, passRate: 95, status: '通过' },
  { id: 2, version: 'v1.2.3', moduleName: '光耦矫正', totalCases: 12, passCount: 12, failCount: 0, passRate: 100, status: '通过' },
  { id: 3, version: 'v1.2.3', moduleName: 'IPC蓝牙测试', totalCases: 18, passCount: 15, failCount: 3, passRate: 83.3, status: '不通过' },
  { id: 4, version: 'v1.2.3', moduleName: '图像测试', totalCases: 25, passCount: 22, failCount: 3, passRate: 88, status: '通过' },
  { id: 5, version: 'v1.3.0-beta', moduleName: '带宽测试', totalCases: 20, passCount: 16, failCount: 4, passRate: 80, status: '通过' },
  { id: 6, version: 'v1.3.0-beta', moduleName: 'IPC老化', totalCases: 8, passCount: 7, failCount: 1, passRate: 87.5, status: '通过' },
];

const ProjectVersionOverview: React.FC = () => {
  const [rowData] = useState<VersionOverviewRow[]>(MOCK_DATA);
  const [searchText, setSearchText] = useState('');
  const [filterModules, setFilterModules] = useState<string[]>([]);
  const [filterVersion, setFilterVersion] = useState<string | undefined>(undefined);

  const gridTheme = useMemo(() => themeQuartz.withParams({ accentColor: '#eb2f96' }), []);

  const versions = [...new Set(rowData.map((r) => r.version))];

  const filteredData = useMemo(() => {
    return rowData.filter((row) => {
      if (searchText && !row.version.toLowerCase().includes(searchText.toLowerCase()) && !row.moduleName.toLowerCase().includes(searchText.toLowerCase())) return false;
      if (filterModules.length > 0 && !filterModules.includes(row.moduleName)) return false;
      if (filterVersion && row.version !== filterVersion) return false;
      return true;
    });
  }, [rowData, searchText, filterModules, filterVersion]);

  const handleCopy = useCallback((row: VersionOverviewRow) => {
    navigator.clipboard.writeText(`${row.version}\t${row.moduleName}\t${row.totalCases}\t${row.passCount}\t${row.failCount}\t${row.passRate}%`).then(() => message.success('已复制')).catch(() => message.error('复制失败'));
  }, []);

  const columnDefs: ColDef<VersionOverviewRow>[] = [
    { field: 'id', headerName: 'ID', width: 60 },
    { field: 'version', headerName: '版本', width: 140 },
    { field: 'moduleName', headerName: '模块', width: 140 },
    { field: 'totalCases', headerName: '总用例', width: 90 },
    { field: 'passCount', headerName: '通过', width: 80, cellStyle: { color: '#52c41a', fontWeight: 600 } },
    { field: 'failCount', headerName: '失败', width: 80, cellStyle: { color: '#ff4d4f', fontWeight: 600 } },
    { field: 'passRate', headerName: '通过率', width: 90, cellRenderer: ({ value }: { value: number }) => `${value}%` },
    { field: 'status', headerName: '判定', width: 80, cellRenderer: ({ value }: { value: string }) => <Tag color={value === '通过' ? 'success' : 'error'}>{value}</Tag> },
    {
      headerName: '操作', width: 120, pinned: 'right' as const,
      cellRenderer: ({ data }: { data: VersionOverviewRow }) => (
        <Space size="small">
          <Button type="link" size="small" icon={<BarChartOutlined />}>详情</Button>
          <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => handleCopy(data)}>复制</Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <h2 style={{ marginBottom: 16 }}>版本测试情况概览</h2>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <Input.Search placeholder="搜索版本号、模块..." value={searchText} onChange={(e) => setSearchText(e.target.value)} onSearch={(v) => setSearchText(v)} allowClear style={{ width: 280 }} />
        <Select mode="multiple" placeholder="所属模块" value={filterModules} onChange={setFilterModules} allowClear style={{ minWidth: 180 }} maxTagCount={2} options={MOCK_MODULES.map((m) => ({ value: m, label: m }))} />
        <Select placeholder="版本" value={filterVersion} onChange={setFilterVersion} allowClear style={{ width: 160 }} options={versions.map((v) => ({ value: v, label: v }))} />
      </div>
      <div style={{ height: 600, width: '100%' }}>
        <AgGridReact<VersionOverviewRow> theme={gridTheme} rowData={filteredData} columnDefs={columnDefs} pagination={true} paginationPageSize={20} defaultColDef={{ sortable: true, resizable: true }} localeText={{ noRowsToShow: '暂无数据' }} />
      </div>
    </div>
  );
};

export default ProjectVersionOverview;
