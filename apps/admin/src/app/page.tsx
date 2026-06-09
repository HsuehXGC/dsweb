'use client';

import { Card, Typography, Tag, Space } from 'antd';
import { DashboardShell } from '@/components/DashboardShell';

const { Title, Paragraph } = Typography;

export default function AdminHome() {
  return (
    <DashboardShell>
      <Card>
        <Title level={3}>欢迎回来 👋</Title>
        <Paragraph type="secondary">
          DS SmartLawn 统一管理后台。Phase 1 已上线 <b>M0 账号与权限</b> 和 <b>M1 CMS 内容管理</b>，
          可在左侧菜单进入「CMS 内容」编辑主页，编辑后客户端刷新即见。
        </Paragraph>
        <Space wrap style={{ marginTop: 8 }}>
          {['M0 IAM ✓', 'M1 CMS ✓', 'M2 CRM', 'M3 ERP', 'M4 客服', 'M5 工单', 'M9 配置'].map((m) => (
            <Tag key={m} color={m.includes('✓') ? 'green' : 'default'}>
              {m}
            </Tag>
          ))}
        </Space>
      </Card>
    </DashboardShell>
  );
}
