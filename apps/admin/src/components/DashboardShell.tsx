'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Layout, Menu, Button, Spin } from 'antd';
import {
  DashboardOutlined,
  FileTextOutlined,
  TeamOutlined,
  SafetyOutlined,
  SettingOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { session } from '@/lib/session';

const { Header, Sider, Content } = Layout;

const MENU = [
  { key: '/', icon: <DashboardOutlined />, label: '仪表板' },
  { key: '/cms', icon: <FileTextOutlined />, label: 'CMS 内容' },
  { key: '/users', icon: <TeamOutlined />, label: '账号管理' },
  { key: '/roles', icon: <SafetyOutlined />, label: '角色权限' },
  { key: '/settings', icon: <SettingOutlined />, label: '系统配置' },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!session.token) {
      router.replace('/login');
    } else {
      setReady(true);
    }
  }, [router]);

  if (!ready) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  const user = session.user;
  const logout = () => {
    session.clear();
    router.replace('/login');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="light" breakpoint="lg" collapsedWidth="0">
        <div
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#1B4332',
            fontWeight: 700,
            fontSize: 16,
          }}
        >
          DS SmartLawn
        </div>
        <Menu
          mode="inline"
          selectedKeys={[pathname]}
          items={MENU}
          onClick={({ key }) => router.push(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 16,
            paddingInline: 24,
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <span style={{ color: '#52595D' }}>
            {user?.email} · {user?.role}
          </span>
          <Button icon={<LogoutOutlined />} onClick={logout} size="small">
            登出
          </Button>
        </Header>
        <Content style={{ padding: 24 }}>{children}</Content>
      </Layout>
    </Layout>
  );
}
