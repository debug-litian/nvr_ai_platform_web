import api from './api';
import type { DeviceInfo, ApiResponse } from '../types';

export async function getDeviceInfo(): Promise<DeviceInfo> {
  const { data } = await api.get('/device/info');
  return data;
}

export async function getAIStates(): Promise<ApiResponse<unknown>> {
  const { data } = await api.get('/device/ai-states');
  return data;
}

export async function controlDevice(action: string, channel = 0, enabled = true) {
  const { data } = await api.post('/device/control', { action, channel, enabled });
  return data;
}

export async function healthCheck() {
  const { data } = await api.get('/health');
  return data;
}
