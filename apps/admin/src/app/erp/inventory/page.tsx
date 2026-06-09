'use client';

import { useEffect, useState } from 'react';
import { Card, Table, Tag, message } from 'antd';
import { DashboardShell } from '@/components/DashboardShell';
import { api } from '@/lib/api';

export default function InventoryPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setRows(await api.listInventory());
      } catch (e) {
        message.error(e instanceof Error ? e.message : '加载失败');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <DashboardShell>
      <Card title="库存（SKU × 仓库）">
        <Table
          rowKey="id"
          loading={loading}
          dataSource={rows}
          pagination={false}
          columns={[
            { title: 'SKU', render: (_, r) => <code>{r.sku?.code}</code> },
            { title: '产品', render: (_, r) => r.sku?.product?.name ?? '—' },
            { title: '仓库', render: (_, r) => `${r.warehouse?.name} (${r.warehouse?.code})` },
            {
              title: '可用',
              dataIndex: 'available',
              render: (v: number, r) =>
                v <= r.lowWatermark ? <Tag color="red">{v} ⚠</Tag> : <span>{v}</span>,
            },
            { title: '已分配', dataIndex: 'allocated' },
            { title: '在途', dataIndex: 'inTransit' },
            { title: '低位线', dataIndex: 'lowWatermark' },
          ]}
        />
      </Card>
    </DashboardShell>
  );
}
