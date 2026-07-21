export interface MenuItem {
  key: string;
  icon?: string;
  label: string;
  children?: MenuItem[];
}

// ---- 模块模式 ----
export type AppModule = 'home' | 'device';
