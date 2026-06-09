'use client';

import { useEffect, useState } from 'react';
import { Card, Typography, Tag, Space, Row, Col, Statistic, Spin } from 'antd';
import { DashboardShell } from '@/components/DashboardShell';
import { api } from '@/lib/api';

const { Title, Paragraph } = Typography;

export default function AdminHome() {
  const [metrics, setMetrics] = useState<Record<string, number> | null>(null);
  const [funnel, setFunnel] = useState<Array<{ label: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [noAccess, setNoAccess] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [m, f] = await Promise.all([api.dashboard(), api.funnel()]);
        setMetrics(m);
        setFunnel(f.stages);
      } catch {
        setNoAccess(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <DashboardShell>
        <div style={{ textAlign: 'center', padding: 64 }}><Spin size="large" /></div>
      </DashboardShell>
    );
  }

  if (noAccess || !metrics) {
    return (
      <DashboardShell>
        <Card>
          <Title level={3}>欢迎回来 👋</Title>
          <Paragraph type="secondary">DS SmartLawn 统一管理后台。</Paragraph>
          <Space wrap>
            {['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9'].map((m) => (
              <Tag key={m} color="green">{m} ✓</Tag>
            ))}
          </Space>
        </Card>
      </DashboardShell>
    );
  }

  const cards: Array<{ title: string; value: number; prefix?: string }> = [
    { title: '今日订单', value: metrics.today_orders },
    { title: '今日工单', value: metrics.today_work_orders },
    { title: '待处理工单', value: metrics.pending_work_orders },
    { title: '本月营收', value: metrics.month_revenue, prefix: '$' },
    { title: '本月新客', value: metrics.month_new_customers },
    { title: '活跃订阅', value: metrics.active_subscriptions },
    { title: 'MRR', value: metrics.mrr, prefix: '$' },
    { title: 'ARR', value: metrics.arr, prefix: '$' },
    { title: '待处理工单(客服)', value: metrics.open_tickets },
  ];

  const maxFunnel = Math.max(...funnel.map((s) => s.count), 1);

  return (
    <DashboardShell>
      <Title level={3} style={{ marginBottom: 16 }}>仪表板</Title>
      <Row gutter={[16, 16]}>
        {cards.map((c) => (
          <Col key={c.title} xs={12} sm={8} md={6} lg={6}>
            <Card>
              <Statistic title={c.title} value={c.value} prefix={c.prefix} />
            </Card>
          </Col>
        ))}
      </Row>

      <Card title="转化漏斗" style={{ marginTop: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {funnel.map((s) => (
            <div key={s.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>{s.label}</span>
                <strong>{s.count}</strong>
              </div>
              <div style={{ height: 10, background: '#eee', borderRadius: 5 }}>
                <div style={{ width: `${(s.count / maxFunnel) * 100}%`, height: '100%', background: '#1B4332', borderRadius: 5 }} />
              </div>
            </div>
          ))}
        </Space>
      </Card>
    </DashboardShell>
  );
}
