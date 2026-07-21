import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import MainLayout from './layouts/MainLayout';

// 首页
import HomeDashboard from './pages/home/HomeDashboard';
import TestTools from './pages/home/TestTools';
import TestCaseList from './pages/home/TestCaseList';
import TestCaseSuites from './pages/home/TestCaseSuites';
import TestCaseTasks from './pages/home/TestCaseTasks';
import TestDataGeneral from './pages/home/TestDataGeneral';
import TestDataSteps from './pages/home/TestDataSteps';
import TestDataTemplates from './pages/home/TestDataTemplates';
import TestDataParams from './pages/home/TestDataParams';
import TestResult from './pages/home/TestResult';
import CIPackages from './pages/home/CIPackages';
import CICrash from './pages/home/CICrash';
import ProjectModules from './pages/home/ProjectModules';
import ProjectVersions from './pages/home/ProjectVersions';
import ProjectVersionOverview from './pages/home/ProjectVersionOverview';
import ProjectSettings from './pages/home/ProjectSettings';
import ProjectBot from './pages/home/ProjectBot';
import Reports from './pages/home/Reports';

// 设备中心
import DeviceDashboard from './pages/device/DeviceDashboard';
import DeviceList from './pages/device/DeviceList';
import DevicePreview from './pages/device/DevicePreview';
import DeviceConfig from './pages/device/DeviceConfig';
import DeviceLogs from './pages/device/DeviceLogs';
import DeviceHeatmap from './pages/device/DeviceHeatmap';
import DeviceChannels from './pages/device/DeviceChannels';
import DeviceFirmware from './pages/device/DeviceFirmware';
import SecurityScan from './pages/device/SecurityScan';

const App: React.FC = () => {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: { colorPrimary: '#1677ff' },
        algorithm: undefined,
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route element={<MainLayout />}>
            {/* 根路径重定向 */}
            <Route path="/" element={<Navigate to="/home/dashboard" replace />} />

            {/* 首页 */}
            <Route path="/home/dashboard" element={<HomeDashboard />} />
            <Route path="/home/test-tools" element={<TestTools />} />
            <Route path="/home/testcase/list" element={<TestCaseList />} />
            <Route path="/home/testcase/suites" element={<TestCaseSuites />} />
            <Route path="/home/testcase/tasks" element={<TestCaseTasks />} />
            <Route path="/home/testdata/general" element={<TestDataGeneral />} />
            <Route path="/home/testdata/steps" element={<TestDataSteps />} />
            <Route path="/home/testdata/templates" element={<TestDataTemplates />} />
            <Route path="/home/testdata/params" element={<TestDataParams />} />
            <Route path="/home/result/overview" element={<TestResult />} />
            <Route path="/home/ci/packages" element={<CIPackages />} />
            <Route path="/home/ci/crash" element={<CICrash />} />
            <Route path="/home/settings/modules" element={<ProjectModules />} />
            <Route path="/home/settings/versions" element={<ProjectVersions />} />
            <Route path="/home/settings/version-overview" element={<ProjectVersionOverview />} />
            <Route path="/home/settings/project" element={<ProjectSettings />} />
            <Route path="/home/settings/bot" element={<ProjectBot />} />
            <Route path="/home/result/reports" element={<Reports />} />

            {/* 设备中心 */}
            <Route path="/device/dashboard" element={<DeviceDashboard />} />
            <Route path="/device/list" element={<DeviceList />} />
            <Route path="/device/preview" element={<DevicePreview />} />
            <Route path="/device/config" element={<DeviceConfig />} />
            <Route path="/device/logs" element={<DeviceLogs />} />
            <Route path="/device/heatmap" element={<DeviceHeatmap />} />
            <Route path="/device/channels" element={<DeviceChannels />} />
            <Route path="/device/firmware" element={<DeviceFirmware />} />
            <Route path="/device/security" element={<SecurityScan />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;
