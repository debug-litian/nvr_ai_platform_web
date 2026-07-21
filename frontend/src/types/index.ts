// TypeScript types for Clarity AI

// ---- 报警类型 ----
export type AlarmType = 'human' | 'vehicle' | 'pet' | 'motion';

export const ALARM_LABELS: Record<AlarmType, string> = {
  human: '人形',
  vehicle: '机动车',
  pet: '宠物',
  motion: '画面变动',
};

// ---- 核验结果 ----
export interface VerificationResult {
  file_path: string;
  channel: number;
  alarm_timestamp: string;
  alarm_timestamp_dt?: string;
  nvr_alarm_type: AlarmType;
  nvr_alarm_label: string;
  filename: string;
  file_type: 'image' | 'video';
  nvr_name: string;
  file_size_mb: number;
  image_width?: number;
  image_height?: number;
  video_width?: number;
  video_height?: number;
  video_duration_sec?: number;
  video_codec?: string;
  yolo_applicable: boolean;
  yolo_match: boolean;
  is_false_alarm: boolean;
  false_alarm_reason: string;
  green_line_detected: boolean;
  green_line_ratio: number;
  config_checks: ConfigCheckResult[];
  config_all_pass?: boolean;
  processing_time_sec: number;
  error?: string;
  verification_failed?: boolean;
  yolo_classes_found?: number[];
  yolo_max_confidence?: number;
  yolo_frames_sampled?: number;
  yolo_frames_with_detections?: number;
  yolo_detections_per_class?: Record<string, number>;
  original: string;
  full_path: string;
}

export interface ConfigCheckResult {
  check_name: string;
  passed: boolean;
  detail: string;
  expected: string;
  actual: string;
}

// ---- 报告 ----
export interface AlarmTypeStat {
  total: number;
  match: number;
  false: number;
  match_rate: number;
  label: string;
}

export interface FTPTestReport {
  total_files: number;
  jpg_count: number;
  mp4_count: number;
  channel_count: number;
  total_channels: number;
  nvr_name: string;
  time_range_start: string | null;
  time_range_end: string | null;
  false_alarm_count: number;
  false_alarm_rate: number;
  yolo_match_count: number;
  yolo_match_rate: number;
  total_verifiable: number;
  overall_score: number;
  channel_coverage_rate: number;
  alarm_type_stats: Record<string, AlarmTypeStat>;
  green_line_count: number;
  schedule_pass_rate: number;
  schedule_coverage_by_hour: Record<number, number>;
  channel_coverage: Record<number, Record<string, number>>;
  file_size_avg_mb: number;
  mp4_duration_avg_sec: number;
  mp4_codecs: Record<string, number>;
  jpg_resolutions: Record<string, number>;
  mp4_resolutions: Record<string, number>;
}

// ---- 配置测试 ----
export interface CategorySummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  pass_rate: number;
}

export interface ConfigTestItem {
  category: string;
  check_name: string;
  channel: number;
  expected: string;
  actual: string;
  passed: boolean;
  detail: string;
}

export type ConfigTestResult = ConfigTestReport;  // alias used in NvrConfig

export interface ConfigTestReport {
  profile_path: string;
  total_checks: number;
  passed: number;
  failed: number;
  skipped: number;
  pass_rate: number;
  categories: Record<string, CategorySummary>;
  items: ConfigTestItem[];
  generated_at: string;
}

// ---- 设备 ----
export interface DeviceInfo {
  connected: boolean;
  model_name: string;
  model_number: string;
  is_nvr: boolean;
  num_channels: number;
  num_cameras: number;
  firmware_version: string;
  hardware_version: string;
  mac_address: string;
  manufacturer: string;
  uid: string;
  serial: string;
  rtsp_enabled: boolean;
  rtsp_port: number;
  onvif_enabled: boolean;
  onvif_port: number;
  [key: string]: unknown;
}

// ---- WebSocket ----
export interface WsMessage {
  type: 'verification_complete' | 'status';
  data: VerificationResult | {
    monitoring: boolean;
    pending: number;
    total_completed: number;
  };
}

// ---- API 通用响应 ----
export interface ApiResponse<T> {
  status?: string;
  count?: number;
  results?: T[];
  [key: string]: unknown;
}
