import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card, Row, Col, Button, Input, Select, Space, Tag, Progress, message } from 'antd';
import {
  PlayCircleOutlined, PauseCircleOutlined, SearchOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import api from '../../services/api';

// ---- 组件1：RTSP 实时预览 + AI画框叠加 ----
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

interface DetectionBox {
  x: number; y: number; w: number; h: number;
  label: string; conf: number;
  color: string;
}

const RTSPPreview: React.FC = () => {
  const [rtspUrl, setRtspUrl] = useState('rtsp://admin:111111..@192.168.124.7/Preview_04_main');
  const [playing, setPlaying] = useState(false);
  const [metadata, setMetadata] = useState<StreamMetadata | null>(null);
  const [detections] = useState<DetectionBox[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);
  const pendingBuffersRef = useRef<Uint8Array[]>([]);

  // 绘制检测框
  const drawDetections = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !metadata) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scaleX = canvas.width / metadata.width;
    const scaleY = canvas.height / metadata.height;

    // 清空
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制所有检测框
    detections.forEach((box) => {
      const x = box.x * scaleX;
      const y = box.y * scaleY;
      const w = box.w * scaleX;
      const h = box.h * scaleY;

      ctx.strokeStyle = box.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);

      ctx.fillStyle = box.color;
      ctx.font = '12px sans-serif';
      ctx.fillText(`${box.label} ${(box.conf * 100).toFixed(0)}%`, x, Math.max(y - 5, 10));
    });
  }, [detections, metadata]);

  // 动画循环
  useEffect(() => {
    if (!playing) return;
    let animId: number;
    const loop = () => { drawDetections(); animId = requestAnimationFrame(loop); };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [playing, drawDetections]);

  // 开始播放
  const handlePlay = () => {
    if (!rtspUrl) { message.warning('请输入 RTSP 地址'); return; }

    const ws = new WebSocket(`ws://127.0.0.1:8000/ws/stream`);
    wsRef.current = ws;
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      ws.send(JSON.stringify({ action: 'start', rtsp_url: rtspUrl }));
    };

    ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        // JSON 消息
        const msg = JSON.parse(event.data);
        if (msg.type === 'metadata') {
          setMetadata(msg.data);
        } else if (msg.type === 'error') {
          message.error(msg.data?.message || '推流错误');
        } else if (msg.type === 'stopped') {
          setPlaying(false);
        }
      } else if (event.data instanceof ArrayBuffer) {
        // 二进制 fMP4 片段 → MediaSource
        const chunk = new Uint8Array(event.data);
        if (sourceBufferRef.current && !sourceBufferRef.current.updating) {
          try {
            sourceBufferRef.current.appendBuffer(chunk);
          } catch {
            pendingBuffersRef.current.push(chunk);
          }
        } else {
          pendingBuffersRef.current.push(chunk);
        }
      }
    };

    ws.onerror = () => message.error('WebSocket 连接失败');

    // 初始化 MediaSource
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
            const next = pendingBuffersRef.current.shift()!;
            try { sb.appendBuffer(next); } catch { /* */ }
          }
        });
      });
    }

    setPlaying(true);
  };

  // 停止播放
  const handleStop = () => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ action: 'stop' }));
      wsRef.current.close();
      wsRef.current = null;
    }
    if (mediaSourceRef.current && mediaSourceRef.current.readyState === 'open') {
      mediaSourceRef.current.endOfStream();
    }
    setPlaying(false);
    setMetadata(null);
    pendingBuffersRef.current = [];
  };

  // 清理
  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const codecLabel = metadata?.video_codec?.toUpperCase() || 'H.264';

  return (
    <Card
      title="RTSP 实时预览 + 画框叠加"
      size="small"
    >
      <Space style={{ marginBottom: 12 }}>
        <Input
          placeholder="RTSP URL"
          value={rtspUrl}
          onChange={(e) => setRtspUrl(e.target.value)}
          style={{ width: 420 }}
          disabled={playing}
        />
        {!playing ? (
          <Button type="primary" icon={<PlayCircleOutlined />} onClick={handlePlay}>播放</Button>
        ) : (
          <Button danger icon={<PauseCircleOutlined />} onClick={handleStop}>停止</Button>
        )}
      </Space>

      {/* 视频 + Canvas 叠加区 */}
      <div style={{ position: 'relative', background: '#000', borderRadius: 8, overflow: 'hidden', minHeight: 360 }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{ width: '100%', display: playing ? 'block' : 'none' }}
        />
        <canvas
          ref={canvasRef}
          width={960}
          height={540}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        />
        {!playing && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: 360, color: '#8c8c8c',
          }}>
            点击播放开始 RTSP 预览
          </div>
        )}
      </div>

      {/* 底部信息栏 */}
      {metadata ? (
        <div style={{ marginTop: 8, fontSize: 12, color: '#8c8c8c' }}>
          帧率: {metadata.fps || '-'}fps | 分辨率: {metadata.resolution || '-'} | {codecLabel}
          {metadata.h265_supported && <Tag color="orange" style={{ marginLeft: 8 }}>H.265</Tag>}
          <Tag color={metadata.stream_status === 'PASS' ? 'success' : 'error'} style={{ marginLeft: 8 }}>
            {metadata.stream_status === 'PASS' ? '拉流成功' : '拉流失败'}
          </Tag>
        </div>
      ) : (
        <div style={{ marginTop: 8, fontSize: 12, color: '#8c8c8c' }}>
          帧率: -- | 分辨率: -- | 点击播放或采集参数
        </div>
      )}
    </Card>
  );
};

// ---- 组件2：文搜视频搜索 ----
const VideoSearch: React.FC = () => {
  const [keyword, setKeyword] = useState('');

  return (
    <Card title="文搜图" size="small">
      <Space style={{ marginBottom: 12, width: '100%' }}>
        <Input.Search
          placeholder="输入搜索关键词（如：红色轿车、穿蓝色衣服的人）"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onSearch={() => { /* 搜索逻辑 */ }}
          enterButton={<><SearchOutlined /> 搜索</>}
          style={{ width: '100%' }}
        />
      </Space>
      <div style={{
        background: '#fafafa', height: 300, borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center', color: '#8c8c8c' }}>
          <SearchOutlined style={{ fontSize: 48, marginBottom: 12 }} />
          <div>输入关键词搜索视频片段</div>
          <div style={{ fontSize: 12 }}>支持自然语言描述 — 基于 CLIP 多模态模型</div>
        </div>
      </div>
    </Card>
  );
};

// ---- 组件3：实时抽帧 ----
const FrameCapture: React.FC = () => {
  const [capturing, setCapturing] = useState(false);
  const [frames] = useState<{ time: string; channel: number; confidence: number }[]>([
    { time: '14:30:01', channel: 1, confidence: 0.87 },
    { time: '14:30:02', channel: 1, confidence: 0.82 },
    { time: '14:30:03', channel: 2, confidence: 0.91 },
  ]);

  return (
    <Card
      title="实时抽帧"
      size="small"
      extra={
        <Space>
          {!capturing ? (
            <Button type="primary" size="small" icon={<PlayCircleOutlined />} onClick={() => setCapturing(true)}>开始抽帧</Button>
          ) : (
            <Button danger size="small" icon={<PauseCircleOutlined />} onClick={() => setCapturing(false)}>停止抽帧</Button>
          )}
        </Space>
      }
    >
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        {frames.map((f, i) => (
          <div key={i} style={{ background: '#fafafa', borderRadius: 8, padding: 8, width: 120, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>{f.time}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#1677ff' }}>{(f.confidence * 100).toFixed(0)}%</div>
            <div style={{ fontSize: 11 }}>通道 {f.channel}</div>
            <Tag color="green">人形</Tag>
          </div>
        ))}
      </div>
    </Card>
  );
};

// ---- 组件4：历史索引 ----
const HistoricalIndex: React.FC = () => {
  const [indexing, setIndexing] = useState(false);
  const [progress, setProgress] = useState(0);

  const startIndex = () => {
    setIndexing(true);
    setProgress(0);
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) { clearInterval(timer); setIndexing(false); return 100; }
        return prev + Math.floor(Math.random() * 15 + 5);
      });
    }, 600);
  };

  return (
    <Card title={<Space><HistoryOutlined /> 历史索引</Space>} size="small">
      <Space style={{ marginBottom: 12 }} wrap>
        <Input placeholder="开始日期" type="date" style={{ width: 160 }} />
        <Input placeholder="结束日期" type="date" style={{ width: 160 }} />
        <Select placeholder="通道" style={{ width: 130 }} options={[1, 2, 3, 4].map((c) => ({ value: c, label: `通道${c}` }))} />
        <Button type="primary" icon={<HistoryOutlined />} onClick={startIndex} loading={indexing}>
          {indexing ? '索引中...' : '触发索引'}
        </Button>
      </Space>
      {indexing && <Progress percent={progress} status="active" style={{ marginBottom: 12 }} />}
      {progress === 100 && <Tag color="success">索引完成！共处理 1,248 个文件</Tag>}
    </Card>
  );
};

// ---- 主页面 ----
const TestTools: React.FC = () => {
  return (
    <div className="page-container">
      <h2 style={{ marginBottom: 16 }}>测试工具</h2>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}><RTSPPreview /></Col>
        <Col span={12}><VideoSearch /></Col>
      </Row>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={24}><FrameCapture /></Col>
      </Row>
      <Row gutter={16}>
        <Col span={24}><HistoricalIndex /></Col>
      </Row>
    </div>
  );
};

export default TestTools;
