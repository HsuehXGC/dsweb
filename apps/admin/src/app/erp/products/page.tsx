'use client';

import { useEffect, useState } from 'react';
import { Card, Table, Tag, message } from 'antd';
import { DashboardShell } from '@/components/DashboardShell';
import { api } from '@/lib/api';

export default function ProductsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setRows(await api.listProducts());
      } catch (e) {
        message.error(e instanceof Error ? e.message : '加载失败');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <DashboardShell>
      <Card title="产品 / SKU">
        <Table
          rowKey="id"
          loading={loading}
          dataSource={rows}
          pagination={false}
          columns={[
            { title: '名称', dataIndex: 'name' },
            { title: 'Slug', dataIndex: 'slug', render: (v) => <code>{v}</code> },
            { title: '类型', dataIndex: 'type', render: (v) => <Tag color={v === 'subscription' ? 'purple' : 'blue'}>{v}</Tag> },
            { title: '基础价', dataIndex: 'basePrice', render: (v) => `$${Number(v).toLocaleString()}` },
            { title: 'SKU 数', render: (_, r) => r.skus?.length ?? 0 },
            { title: '在售', dataIndex: 'isActive', render: (v) => (v ? <Tag color="green">是</Tag> : <Tag>否</Tag>) },
          ]}
        />
      </Card>
    </DashboardShell>
  );
}
