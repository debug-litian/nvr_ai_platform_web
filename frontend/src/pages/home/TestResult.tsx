import React, { useState, useMemo, useCallback } from 'react';
import { Button, Input, Select, Space, Modal, Form, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined, CopyOutlined, DeleteOutlined, LinkOutlined } from '@ant-design/icons';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import type { ColDef } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

interface ResultRow {
  id: number;
  caseName: string;
  moduleName: string;
  expectedValue: string;
  actualValue: string;
  result: 'Pass' | 'Fail';
  executeTime: string;
}

const MOCK_MODULES = ['带宽测试', '光耦矫正', 'IPC蓝牙测试', '图像测试', 'IPC老化'];
const MOCK_DATA: ResultRow[] = [
  { id: 1, caseName: '2.4G发送测试', moduleName: '带宽测试', expectedValue: '>=50Mbps', actualValue: '52.3Mbps', result: 'Pass', executeTime: '2025-07-16 09:05' },
  { id: 2, caseName: '5G接收测试', moduleName: '带宽测试', expectedValue: '>=100Mbps', actualValue: '87.2Mbps', result: 'Fail', executeTime: '2025-07-16 09:10' },
  { id: 3, caseName: '光耦校准', moduleName: '光耦矫正', expectedValue: '偏差<=0.5', actualValue: '0.3', result: 'Pass', executeTime: '2025-07-16 10:00' },
  { id: 4, caseName: '蓝牙信号强度', moduleName: 'IPC蓝牙测试', expectedValue: '-70 ~ -30dBm', actualValue: '-65dBm', result: 'Pass', executeTime: '2025-07-16 11:00' },
  { id: 5, caseName: '清晰度测试', moduleName: '图像测试', expectedValue: '>=80分', actualValue: '72分', result: 'Fail', executeTime: '2025-07-16 12:00' },
  { id: 6, caseName: 'IR-CUT切换', moduleName: '图像测试', expectedValue: '<=3s', actualValue: '2.1s', result: 'Pass', executeTime: '2025-07-16 12:05' },
  { id: 7, caseName: '老化启动', moduleName: 'IPC老化', expectedValue: '成功', actualValue: '成功', result: 'Pass', executeTime: '2025-07-16 13:00' },
];

const TestResult: React.FC = () => {
  const [rowData] = useState<ResultRow[]>(MOCK_DATA);
  const [searchText, setSearchText] = useState('');
  const [filterModules, setFilterModules] = useState<string[]>([]);
  const [filterResult, setFilterResult] = useState<string | undefined>(undefined);

  const gridTheme = useMemo(() => themeQuartz.withParams({ accentColor: '#eb2f96' }), []);

  const filteredData = useMemo(() => {
    return rowData.filter((row) => {
      if (searchText && !row.caseName.toLowerCase().includes(searchText.toLowerCase())) return false;
      if (filterModules.length > 0 && !filterModules.includes(row.moduleName)) return false;
      if (filterResult && row.result !== filterResult) return false;
      return true;
    });
  }, [rowData, searchText, filterModules, filterResult]);

  const handleCopy = useCallback((row: ResultRow) => {
    navigator.clipboard.writeText(`${row.caseName}\t${row.moduleName}\t${row.expectedValue}\t${row.actualValue}\t${row.result}`).then(() => message.success('已复制')).catch(() => message.error('复制失败'));
  }, []);

  const columnDefs: ColDef<ResultRow>[] = [
    { field: 'id', headerName: 'ID', width: 60 },
    { field: 'caseName', headerName: '测试用例', width: 180 },
    { field: 'moduleName', headerName: '所属模块', width: 140 },
    { field: 'expectedValue', headerName: '期望值(A)', width: 150 },
    { field: 'actualValue', headerName: '实际值(B)', width: 150 },
    { field: 'result', headerName: '结果', width: 80, cellRenderer: ({ value }: { value: string }) => <Tag color={value === 'Pass' ? 'success' : 'error'}>{value}</Tag> },
    { field: 'executeTime', headerName: '执行时间', width: 160 },
    {
      headerName: '操作', width: 120, pinned: 'right' as const,
      cellRenderer: ({ data }: { data: ResultRow }) => (
        <Space size="small">
          <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => handleCopy(data)}>复制</Button>
        </Space>
      ),
    },
  ];

  // 统计
  const passCount = rowData.filter((r) => r.result === 'Pass').length;
  const failCount = rowData.filter((r) => r.result === 'Fail').length;

  return (
    <div className="page-container">
      <h2 style={{ marginBottom: 16 }}>测试结果</h2>
      {/* 统计卡片 */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <div style={{ background: '#f6ffed', borderRadius: 8, padding: '16px 24px', flex: 1 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#52c41a' }}>{passCount}</div>
          <div style={{ fontSize: 13, color: '#8c8c8c' }}>Pass</div>
        </div>
        <div style={{ background: '#fff2f0', borderRadius: 8, padding: '16px 24px', flex: 1 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#ff4d4f' }}>{failCount}</div>
          <div style={{ fontSize: 13, color: '#8c8c8c' }}>Fail</div>
        </div>
        <div style={{ background: '#f0f5ff', borderRadius: 8, padding: '16px 24px', flex: 1 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#1677ff' }}>{rowData.length ? (passCount / rowData.length * 100).toFixed(0) : 0}%</div>
          <div style={{ fontSize: 13, color: '#8c8c8c' }}>通过率</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <Input.Search placeholder="搜索测试用例..." value={searchText} onChange={(e) => setSearchText(e.target.value)} onSearch={(v) => setSearchText(v)} allowClear style={{ width: 280 }} />
        <Select mode="multiple" placeholder="所属模块" value={filterModules} onChange={setFilterModules} allowClear style={{ minWidth: 180 }} maxTagCount={2} options={MOCK_MODULES.map((m) => ({ value: m, label: m }))} />
        <Select placeholder="结果" value={filterResult} onChange={setFilterResult} allowClear style={{ width: 120 }} options={['Pass', 'Fail'].map((r) => ({ value: r, label: r }))} />
      </div>
      <div style={{ height: 600, width: '100%' }}>
        <AgGridReact<ResultRow> theme={gridTheme} rowData={filteredData} columnDefs={columnDefs} pagination={true} paginationPageSize={20} defaultColDef={{ sortable: true, resizable: true }} localeText={{ noRowsToShow: '暂无数据' }} />
      </div>
    </div>
  );
};

export default TestResult;
