import api from './api';
import type { VerificationResult, ApiResponse } from '../types';

export function startVerification(watchDir?: string) {
  return api.post('/verification/start', watchDir ? { watch_dir: watchDir } : {});
}

export function stopVerification() {
  return api.post('/verification/stop');
}

export async function getResults(): Promise<ApiResponse<VerificationResult>> {
  const { data } = await api.get('/verification/results');
  return data;
}

export async function getReport(format: 'json' | 'csv' | 'html' = 'json') {
  const { data } = await api.get('/verification/report', { params: { format } });
  return data;
}

export async function getConfigTestReport() {
  const { data } = await api.get('/config-test/report');
  return data;
}
