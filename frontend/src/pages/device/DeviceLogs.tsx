import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card, Row, Col, Button, Input, Space, Tag, message, Table } from 'antd';
import {
  PlayCircleOutlined, PauseCircleOutlined,
  CameraOutlined, ReloadOutlined,
} from '@ant-design/icons';
import api from '../../services/api';

// ---- 类型 ----
interface StreamMetadata {
  video_codec: string;
  audio_codec: string | null;
  resolution: string;
  width: number;
  height: number;
  fps: number;
  bitrate_kbps: number;
  h265_supported: boolean;
  stream_status: string;
  error: string | null;
}

interface ReportRow {
  id: number;
  camera_name: string;
  rtsp_url: string;
  video_codec: string;
  resolution: string;
  fps: number;
  h265_supported: boolean;
  stream_status: string;
  latency_ms: number;
  created_at: string;
}

// ---- RTSP 预览 (从 TestTools 复用的真实播放逻辑) ----
const RTSPPlayer: React.FC<{
  rtspUrl: string;
  onMetadata?: (m: StreamMetadata) => void;
}> = ({ rtspUrl, onMetadata }) => {
  const [playing, setPlaying] = useState(false);
  const [metadata, setMetadata] = useState<StreamMetadata | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);
  const pendingBuffersRef = useRef<Uint8Array[]>([]);

  const handlePlay = () => {
    if (!rtspUrl) { message.warning('请输入 RTSP 地址'); return; }
    const ws = new WebSocket('ws://127.0.0.1:8000/ws/stream');
    wsRef.current = ws;
    ws.binaryType = 'arraybuffer';
    ws.onopen = () => ws.send(JSON.stringify({ action: 'start', rtsp_url: rtspUrl }));
    ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        const msg = JSON.parse(event.data);
        if (msg.type === 'metadata') { setMetadata(msg.data); onMetadata?.(msg.data); }
        else if (msg.type === 'error') message.error(msg.data?.message || '推流错误');
        else if (msg.type === 'stopped') setPlaying(false);
      } else if (event.data instanceof ArrayBuffer) {
        const chunk = new Uint8Array(event.data);
        if (sourceBufferRef.current && !sourceBufferRef.current.updating) {
          try { sourceBufferRef.current.appendBuffer(chunk); } catch { pendingBuffersRef.current.push(chunk); }
        } else { pendingBuffersRef.current.push(chunk); }
      }
    };
    ws.onerror = () => message.error('WebSocket 连接失败');

    const ms = new MediaSource();
    mediaSourceRef.current = ms;
    const video = videoRef.current;
    if (video) {
      video.src = URL.createObjectURL(ms);
      ms.addEventListener('sourceopen', () => {
        const sb = ms.addSourceBuffer('video/mp4; codecs="avc1.64001f"');
        sourceBufferRef.current = sb;
        sb.addEventListener('updateend', () => {
          if (pendingBuffersRef.current.length > 0) {
            try { sb.appendBuffer(pendingBuffersRef.current.shift()!); } catch { /* */ }
          }
        });
      });
    }
    setPlaying(true);
  };

  const handleStop = () => {
    if (wsRef.current) { wsRef.current.send(JSON.stringify({ action: 'stop' })); wsRef.current.close(); }
    if (mediaSourceRef.current?.readyState === 'open') mediaSourceRef.current.endOfStream();
    setPlaying(false); setMetadata(null);
    pendingBuffersRef.current = [];
  };

  useEffect(() => { return () => { wsRef.current?.close(); }; }, []);

  const codecLabel = metadata?.video_codec?.toUpperCase() || '--';

  return (
    <Card title="RTSP 实时预览" size="small">
      <div style={{ position: 'relative', background: '#000', borderRadius: 8, overflow: 'hidden', minHeight: 300 }}>
        <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', display: playing ? 'block' : 'none' }} />
        <canvas ref={canvasRef} width={960} height={540} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
        {!playing && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#8c8c8c' }}>
            点击播放开始 RTSP 预览
          </div>
        )}
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: '#8c8c8c' }}>
        帧率: {metadata?.fps || '--'}fps | 分辨率: {metadata?.resolution || '--'} | {codecLabel}
        {metadata?.h265_supported && <Tag color="orange" style={{ marginLeft: 8 }}>H.265</Tag>}
        {metadata?.stream_status && (
          <Tag color={metadata.stream_status === 'PASS' ? 'success' : 'error'} style={{ marginLeft: 8 }}>
            {metadata.stream_status === 'PASS' ? '拉流成功' : '拉流失败'}
          </Tag>
        )}
      </div>
    </Card>
  );
};

// ---- 设备日志主页面 ----
const DeviceLogs: React.FC = () => {
  const [rtspUrl, setRtspUrl] = useState('rtsp://admin:111111..@192.168.124.7/Preview_04_main');
  const [playing, setPlaying] = useState(false);
  const [metadata, setMetadata] = useState<StreamMetadata | null>(null);
  const [collecting, setCollecting] = useState(false);
  const [reports, setReports] = useState<ReportRow[]>([]);

  // 加载采集报告列表
  const loadReports = async () => {
    try {
      const { data } = await api.get('/camera/reports');
      setReports(data.reports || []);
    } catch { /* */ }
  };

  useEffect(() => { loadReports(); }, []);

  // 采集参数并生成报告
  const handleCollect = async () => {
    if (!rtspUrl) { message.warning('请输入 RTSP 地址'); return; }
    setCollecting(true);
    try {
      const probeData = await api.get('/stream/probe', { params: { rtsp_url: rtspUrl } });
      setMetadata(probeData.data);
      await api.post('/rtsp/collect', {
        ...probeData.data,
        rtsp_url: rtspUrl,
        camera_name: rtspUrl,
        play_status: 'PASS',
      });
      message.success('参数已采集并保存到测试报告');
      loadReports();
    } catch {
      message.error('采集失败，请检查摄像机是否在线');
    }
    setCollecting(false);
  };

  return (
    <div className="page-container">
      <h2 style={{ marginBottom: 16 }}>设备日志</h2>

      {/* 控制栏 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <span>RTSP 地址:</span>
          <Input value={rtspUrl} onChange={(e) => setRtspUrl(e.target.value)} style={{ width: 420 }} disabled={playing} />
          {!playing ? (
            <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => setPlaying(true)}>播放</Button>
          ) : (
            <Button danger icon={<PauseCircleOutlined />} onClick={() => setPlaying(false)}>停止</Button>
          )}
          <Button icon={<ReloadOutlined />} onClick={() => setPlaying(false)}>重置</Button>
          <Button
            icon={<CameraOutlined />}
            onClick={handleCollect}
            loading={collecting}
            type="primary"
            style={{ backgroundColor: '#eb2f96', borderColor: '#eb2f96' }}
          >
            采集参数并生成报告
          </Button>
        </Space>
      </Card>

      {/* RTSP 预览 + 采集报告列表 */}
      <Row gutter={16}>
        <Col span={12}>
          {playing ? (
            <RTSPPlayer rtspUrl={rtspUrl} onMetadata={setMetadata} />
          ) : (
            <Card title="RTSP 实时预览" size="small">
              <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1f1f1f', borderRadius: 8, color: '#8c8c8c' }}>
                点击播放开始 RTSP 预览
              </div>
            </Card>
          )}
        </Col>

        {/* 采集报告列表 */}
        <Col span={12}>
          <Card title="采集报告" size="small">
            <Table<ReportRow>
              dataSource={reports}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 5 }}
              columns={[
                { title: 'ID', dataIndex: 'id', width: 50 },
                { title: '编码', dataIndex: 'video_codec', width: 80, render: (v: string) => <Tag>{v?.toUpperCase() || '-'}</Tag> },
                { title: '分辨率', dataIndex: 'resolution', width: 120 },
                { title: '帧率', dataIndex: 'fps', width: 60, render: (v: number) => v ? `${v}fps` : '-' },
                {
                  title: 'H.265', dataIndex: 'h265_supported', width: 70,
                  render: (v: boolean) => v ? <Tag color="orange">支持</Tag> : <Tag>不支持</Tag>,
                },
                {
                  title: '状态', dataIndex: 'stream_status', width: 80,
                  render: (v: string) => <Tag color={v === 'PASS' ? 'success' : 'error'}>{v}</Tag>,
                },
                { title: '时间', dataIndex: 'created_at', width: 160 },
              ]}
              locale={{ emptyText: '暂无采集报告' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DeviceLogs;
