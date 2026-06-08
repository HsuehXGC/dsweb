'use client';

import { Card, Typography, Layout, Tag } from 'antd';

const { Title, Paragraph } = Typography;
const { Header, Content } = Layout;

/**
 * 管理后台首页占位 —— 后续接入 M0 登录鉴权后，
 * 按角色渲染左侧菜单与各模块（M0–M9）。
 */
export default function AdminHome() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#14563b', color: '#fff', fontSize: 18, fontWeight: 600 }}>
        DS SmartLawn · 统一管理后台
      </Header>
      <Content style={{ padding: 24, maxWidth: 960, margin: '0 auto', width: '100%' }}>
        <Card>
          <Title level={3}>脚手架就绪 🚀</Title>
          <Paragraph type="secondary">
            管理后台基础框架已搭建。下一步将实现 M0 账号与权限（登录、RBAC、角色矩阵），
            随后逐模块接入 CMS / CRM / ERP / 客服 / 工单。
          </Paragraph>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            {['M0 IAM', 'M1 CMS', 'M2 CRM', 'M3 ERP', 'M4 客服', 'M5 工单', 'M9 配置'].map((m) => (
              <Tag key={m} color="green">
                {m}
              </Tag>
            ))}
          </div>
        </Card>
      </Content>
    </Layout>
  );
}
