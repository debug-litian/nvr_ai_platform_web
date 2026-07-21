import React, { useState, useMemo, useCallback } from 'react';
import {
  Card, Row, Col, Button, Input, Select, Space, Tag, message, Table,
  Collapse, Progress, Statistic, Modal, Form, Descriptions, Switch,
} from 'antd';
import {
  SecurityScanOutlined, BugOutlined, WifiOutlined,
  UsbOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ReloadOutlined, DeleteOutlined, PlayCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import type { ColDef } from 'ag-grid-community';
import { gridDefaultProps } from '../../utils/gridOptions';
import api from '../../services/api';

ModuleRegistry.registerModules([AllCommunityModule]);

// ---- 类型 ----
interface PortResult {
  port: number;
  protocol: string;
  service: string;
  version: string;
  state: string;
}

interface ScanResult {
  scan_status: string;
  check_status?: string;
  target: string;
  port_count?: number;
  open_ports?: PortResult[];
  found_tools?: string[];
  removed_tools?: string[];
  has_password?: boolean;
  auto_login?: boolean;
  prompt_received?: string;
  raw_summary?: string;
  details?: string;
  error?: string | null;
}

interface ScanRecord {
  id: number;
  target_ip: string;
  scan_type: string;
  scan_args: string;
  scan_status: string;
  details: string;
  created_at: string;
  result: ScanResult;
}

// ---- 扫描类型选项 ----
const SCAN_TYPES = [
  { value: 'nmap', label: 'Nmap 端口扫描', icon: <WifiOutlined /> },
  { value: 'serial', label: '串口登录验证', icon: <UsbOutlined /> },
  { value: 'busybox', label: 'Busybox 工具检查', icon: <BugOutlined /> },
];

const SecurityScan: React.FC = () => {
  // 扫描参数
  const [scanType, setScanType] = useState('nmap');
  const [targetIp, setTargetIp] = useState('192.168.124.2');
  const [ports, setPorts] = useState('1-10000');
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  // Busybox 参数
  const [sshUser, setSshUser] = useState('root');
  const [sshPass, setSshPass] = useState('');
  // 串口参数
  const [serialPort, setSerialPort] = useState('COM1');
  const [serialBaud, setSerialBaud] = useState(115200);

  // 列表
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const gridTheme = useMemo(() => themeQuartz.withParams({ accentColor: '#eb2f96' }), []);

  // 加载历史记录
  const loadScans = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/security/scans', { params: { limit: 50 } });
      setScans(data.scans || []);
    } catch { /* */ }
    setLoading(false);
  }, []);

  React.useEffect(() => { loadScans(); }, [loadScans]);

  // 触发扫描
  const handleScan = async () => {
    if (!targetIp && scanType !== 'serial') { message.warning('请输入目标 IP'); return; }
    setScanning(true);
    setProgress(0);

    // 模拟进度
    const t = setInterval(() => setProgress((p) => p >= 90 ? 90 : p + Math.floor(Math.random() * 10 + 3)), 500);

    try {
      const payload: Record<string, unknown> = { scan_type: scanType };
      if (scanType === 'nmap') {
        payload.target_ip = targetIp;
        payload.ports = ports;
      } else if (scanType === 'busybox') {
        payload.target_ip = targetIp;
        payload.username = sshUser;
        payload.password = sshPass;
      } else if (scanType === 'serial') {
        payload.serial_port = serialPort;
        payload.baudrate = serialBaud;
      }

      const { data } = await api.post('/security/scan', payload);
      if (data.status === 'ok') {
        message.success(`扫描完成 (ID: ${data.id})`);
        loadScans();
      }
    } catch {
      message.error('扫描失败');
    }

    clearInterval(t);
    setProgress(100);
    setTimeout(() => { setScanning(false); setProgress(0); }, 1000);
  };

  // 删除记录
  const handleDelete = useCallback((id: number) => {
    Modal.confirm({
      title: '确认删除', content: `确定删除扫描记录 #${id}？`,
      okText: '删除', okType: 'danger', cancelText: '取消',
      onOk: async () => { await api.delete(`/security/scans/${id}`); loadScans(); message.success('已删除'); },
    });
  }, [loadScans]);

  // AG Grid 列
  const columnDefs: ColDef<ScanRecord>[] = [
    { field: 'id', headerName: 'ID', width: 60 },
    { field: 'scan_type', headerName: '类型', width: 120, cellRenderer: ({ value }: { value: string }) => {
      const labels: Record<string, string> = { nmap: '端口扫描', serial: '串口验证', busybox: '工具检查' };
      return <Tag>{labels[value] || value}</Tag>;
    }},
    { field: 'target_ip', headerName: '目标', width: 180 },
    { field: 'scan_status', headerName: '状态', width: 90, cellRenderer: ({ value }: { value: string }) => {
      const color = value === 'PASS' ? 'success' : value === 'FAIL' ? 'error' : value === 'SKIP' ? 'warning' : 'default';
      return <Tag color={color}>{value}</Tag>;
    }},
    { field: 'details', headerName: '详情', flex: 1, minWidth: 250 },
    { field: 'created_at', headerName: '时间', width: 170 },
    {
      headerName: '操作', width: 100, pinned: 'right' as const,
      cellRenderer: ({ data }: { data: ScanRecord }) => (
        <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(data.id)}>删除</Button>
      ),
    },
  ];

  // 安全扫描统计
  const passCount = scans.filter((s) => s.scan_status === 'PASS').length;
  const failCount = scans.filter((s) => s.scan_status === 'FAIL').length;

  return (
    <div className="page-container">
      <h2 style={{ marginBottom: 16 }}><SecurityScanOutlined /> 安全扫描</h2>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}><Card><Statistic title="总扫描" value={scans.length} prefix={<SecurityScanOutlined />} /></Card></Col>
        <Col span={6}><Card><Statistic title="通过" value={passCount} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="未通过" value={failCount} prefix={<CloseCircleOutlined />} valueStyle={{ color: '#ff4d4f' }} /></Card></Col>
        <Col span={6}>
          <Card>
            <Button type="primary" icon={<ReloadOutlined />} onClick={loadScans} loading={loading} block>刷新列表</Button>
          </Card>
        </Col>
      </Row>

      {/* 扫描参数配置 */}
      <Card title="扫描参数配置" size="small" style={{ marginBottom: 16 }}>
        <Space wrap size="middle">
          <Select
            value={scanType}
            onChange={setScanType}
            style={{ width: 200 }}
            options={SCAN_TYPES}
            disabled={scanning}
          />

          {scanType === 'nmap' && (
            <>
              <span>目标 IP:</span>
              <Input value={targetIp} onChange={(e) => setTargetIp(e.target.value)} style={{ width: 160 }} disabled={scanning} />
              <span>端口范围:</span>
              <Input value={ports} onChange={(e) => setPorts(e.target.value)} style={{ width: 130 }} disabled={scanning} />
            </>
          )}

          {scanType === 'busybox' && (
            <>
              <span>目标 IP:</span>
              <Input value={targetIp} onChange={(e) => setTargetIp(e.target.value)} style={{ width: 160 }} disabled={scanning} />
              <span>SSH 用户:</span>
              <Input value={sshUser} onChange={(e) => setSshUser(e.target.value)} style={{ width: 120 }} disabled={scanning} />
              <span>SSH 密码:</span>
              <Input.Password value={sshPass} onChange={(e) => setSshPass(e.target.value)} style={{ width: 150 }} disabled={scanning} />
            </>
          )}

          {scanType === 'serial' && (
            <>
              <span>串口:</span>
              <Input value={serialPort} onChange={(e) => setSerialPort(e.target.value)} style={{ width: 100 }} disabled={scanning} />
              <span>波特率:</span>
              <Input value={serialBaud} onChange={(e) => setSerialBaud(Number(e.target.value))} type="number" style={{ width: 120 }} disabled={scanning} />
            </>
          )}

          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={handleScan}
            loading={scanning}
            danger
          >
            {scanning ? '扫描中...' : '开始扫描'}
          </Button>
        </Space>
        {scanning && <Progress percent={progress} status="active" style={{ marginTop: 12 }} />}
      </Card>

      {/* AG Grid 扫描列表 */}
      <Card title="扫描记录" size="small">
        <div style={{ height: 500, width: '100%' }}>
          <AgGridReact<ScanRecord>
            theme={gridTheme}
            rowData={scans}
            columnDefs={columnDefs}
            {...gridDefaultProps}
          />
        </div>
      </Card>
    </div>
  );
};

export default SecurityScan;
