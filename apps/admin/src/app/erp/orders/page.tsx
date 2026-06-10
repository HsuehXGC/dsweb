'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Table, Tag, Select, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DashboardShell } from '@/components/DashboardShell';
import { api } from '@/lib/api';

const FULFILLMENT_LABEL: Record<string, { text: string; color: string }> = {
  delivery: { text: '🚚 送货', color: 'blue' },
  pickup: { text: '🏬 自提', color: 'green' },
};

const STATUS = ['pending', 'paid', 'preparing', 'shipped', 'delivered', 'refunded', 'cancelled'];
const COLOR: Record<string, string> = {
  pending: 'gold',
  paid: 'green',
  preparing: 'cyan',
  shipped: 'blue',
  delivered: 'purple',
  refunded: 'red',
  cancelled: 'default',
};

export default function OrdersPage() {
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await api.listOrders());
    } catch (e) {
      message.error(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const changeStatus = async (id: string, status: string) => {
    try {
      await api.updateOrderStatus(id, status);
      message.success('已更新');
      await load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '更新失败');
    }
  };

  const columns: ColumnsType<any> = [
    {
      title: '订单号',
      dataIndex: 'number',
      render: (v: string, r) => (
        <a onClick={() => router.push(`/erp/orders/${r.id}`)} style={{ fontWeight: 500 }}>
          {v}
        </a>
      ),
    },
    {
      title: '客户',
      render: (_, r) => r.customer?.email ?? '—',
    },
    { title: '类型', dataIndex: 'type', render: (v) => <Tag>{v}</Tag> },
    {
      title: '履约',
      render: (_, r) => {
        const m = r.shippingAddress?.method as string | undefined;
        const f = m ? FULFILLMENT_LABEL[m] : null;
        return f ? <Tag color={f.color}>{f.text}</Tag> : <span style={{ color: '#ccc' }}>—</span>;
      },
    },
    { title: '合计', dataIndex: 'total', render: (v) => `$${Number(v).toLocaleString()}` },
    {
      title: '状态',
      dataIndex: 'status',
      render: (v: string, r) => (
        <Select
          size="small"
          value={v}
          style={{ width: 130 }}
          onChange={(s) => changeStatus(r.id, s)}
          options={STATUS.map((s) => ({ value: s, label: <Tag color={COLOR[s]}>{s}</Tag> }))}
        />
      ),
    },
    {
      title: '下单时间',
      dataIndex: 'placedAt',
      render: (v) => new Date(v).toLocaleString(),
    },
  ];

  return (
    <DashboardShell>
      <Card title="订单">
        <Table rowKey="id" loading={loading} dataSource={rows} columns={columns} pagination={{ pageSize: 15 }} />
      </Card>
    </DashboardShell>
  );
}
