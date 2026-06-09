'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, Table, Tag, Button, message } from 'antd';
import { DashboardShell } from '@/components/DashboardShell';
import { api } from '@/lib/api';

const COLOR: Record<string, string> = {
  active: 'green',
  paused: 'gold',
  cancelled: 'default',
  past_due: 'red',
};

export default function SubscriptionsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await api.listSubscriptions());
    } catch (e) {
      message.error(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runBilling = async () => {
    setRunning(true);
    try {
      const r = await api.runBilling();
      message.success(`已处理 ${r.processed} 笔到期扣款`);
      await load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '执行失败');
    } finally {
      setRunning(false);
    }
  };

  return (
    <DashboardShell>
      <Card
        title="订阅"
        extra={
          <Button loading={running} onClick={runBilling}>
            运行到期扣款
          </Button>
        }
      >
        <Table
          rowKey="id"
          loading={loading}
          dataSource={rows}
          pagination={{ pageSize: 15 }}
          columns={[
            { title: '客户', render: (_, r) => r.customer?.email ?? '—' },
            { title: '月费', dataIndex: 'planPrice', render: (v) => `$${Number(v)}` },
            { title: '状态', dataIndex: 'status', render: (v) => <Tag color={COLOR[v]}>{v}</Tag> },
            {
              title: '下次扣款',
              dataIndex: 'nextBillingAt',
              render: (v) => (v ? new Date(v).toLocaleDateString() : '—'),
            },
            {
              title: '已取消',
              dataIndex: 'cancelledAt',
              render: (v) => (v ? new Date(v).toLocaleDateString() : '—'),
            },
          ]}
        />
      </Card>
    </DashboardShell>
  );
}
