import type { Metadata } from 'next';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider } from 'antd';

export const metadata: Metadata = {
  title: 'DSweb 管理后台',
  description: 'DS SmartLawn 统一管理后台',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body style={{ margin: 0 }}>
        <AntdRegistry>
          <ConfigProvider theme={{ token: { colorPrimary: '#1f6b4a' } }}>
            {children}
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
