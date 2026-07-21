import React, { useState, useRef } from 'react';
import { Card, Input, Button, Space, Tag, Select } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined } from '@ant-design/icons';

// 模拟设备列表
const MOCK_CHANNELS = [
  { id: 1, name: '通道1 - 门口', rtsp: 'rtsp://192.168.124.2:554/Preview_01_main' },
  { id: 2, name: '通道2 - 大厅', rtsp: 'rtsp://192.168.124.2:554/Preview_02_main' },
  { id: 3, name: '通道3 - 后院', rtsp: 'rtsp://192.168.124.2:554/Preview_03_main' },
  { id: 4, name: '通道4 - 车库', rtsp: 'rtsp://192.168.124.2:554/Preview_04_main' },
];

const DevicePreview: React.FC = () => {
  const [rtspUrl, setRtspUrl] = useState(MOCK_CHANNELS[0].rtsp);
  const [playing, setPlaying] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlay = () => {
    setPlaying(true);
    // RTSP 无法直接在前端播放，这里用 canvas 显示占位画面
  };

  const handleStop = () => {
    setPlaying(false);
  };

  const handleChannelChange = (chId: number) => {
    const ch = MOCK_CHANNELS.find((c) => c.id === chId);
    if (ch) {
      setRtspUrl(ch.rtsp);
      setSelectedChannel(chId);
      setPlaying(false);
    }
  };

  // 模拟检测框绘制
  const drawMockBoxes = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!playing) {
      ctx.fillStyle = '#1f1f1f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#8c8c8c';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('点击播放开始预览', canvas.width / 2, canvas.height / 2);
      return;
    }

    // 模拟画面背景
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 模拟检测框
    const boxes = [
      { x: 100, y: 80, w: 120, h: 200, label: '人形', conf: 0.87, color: '#52c41a' },
      { x: 400, y: 150, w: 100, h: 140, label: '车辆', conf: 0.92, color: '#1677ff' },
      { x: 250, y: 250, w: 60, h: 80, label: '宠物', conf: 0.50, color: '#faad14' },
    ];

    boxes.forEach((box) => {
      ctx.strokeStyle = box.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(box.x, box.y, box.w, box.h);
      ctx.fillStyle = box.color;
      ctx.font = '12px sans-serif';
      ctx.fillText(`${box.label} ${(box.conf * 100).toFixed(0)}%`, box.x, box.y - 5);
    });

    // 底部信息栏
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('帧率: 25fps | 分辨率: 1920x1080 | H.264', 10, canvas.height - 10);
  };

  // 播放动画循环
  React.useEffect(() => {
    if (!playing) {
      drawMockBoxes();
      return;
    }
    const timer = setInterval(drawMockBoxes, 200);
    return () => clearInterval(timer);
  }, [playing]);

  return (
    <div className="page-container">
      <h2 style={{ marginBottom: 16 }}>实时预览</h2>

      {/* 设备选择 + RTSP 输入 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <span>选择通道:</span>
          <Select
            value={selectedChannel}
            onChange={handleChannelChange}
            style={{ width: 180 }}
            options={MOCK_CHANNELS.map((c) => ({ value: c.id, label: c.name }))}
          />
          <span>RTSP 地址:</span>
          <Input value={rtspUrl} onChange={(e) => setRtspUrl(e.target.value)} style={{ width: 400 }} />
          {!playing ? (
            <Button type="primary" icon={<PlayCircleOutlined />} onClick={handlePlay}>播放</Button>
          ) : (
            <Button danger icon={<PauseCircleOutlined />} onClick={handleStop}>停止</Button>
          )}
          <Button icon={<ReloadOutlined />} onClick={() => { setPlaying(false); drawMockBoxes(); }}>重置</Button>
        </Space>
      </Card>

      {/* 视频画面 + 检测框 Canvas */}
      <Card>
        <div style={{ position: 'relative', background: '#000', borderRadius: 8, overflow: 'hidden' }}>
          {/* 隐藏的 video 标签（实际 RTSP 需要后端转码为 WebRTC/HLS） */}
          <video ref={videoRef} style={{ display: 'none' }} />
          <canvas
            ref={canvasRef}
            width={960}
            height={540}
            style={{ width: '100%', display: 'block' }}
            onClick={() => drawMockBoxes()}
          />
        </div>
        <div style={{ marginTop: 12, fontSize: 13, color: '#8c8c8c' }}>
          <Tag color="green">人形检测: 87%</Tag>
          <Tag color="blue">车辆检测: 92%</Tag>
          <Tag color="orange">宠物检测: 50%</Tag>
          <span style={{ marginLeft: 16 }}>模拟检测框 — 实际 RTSP 流需后端转码为 WebRTC/HLS 方可播放</span>
        </div>
      </Card>
    </div>
  );
};

export default DevicePreview;
