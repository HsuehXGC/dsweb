'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Table, Tag, Input, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DashboardShell } from '@/components/DashboardShell';
import { api } from '@/lib/api';

interface Customer {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  source: string | null;
  vipLevel: number;
}

export default function CustomersPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (search = '') => {
    setLoading(true);
    try {
      const res = await api.listCustomers(search ? { q: search } : {});
      setRows(res);
    } catch (e) {
      message.error(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: ColumnsType<Customer> = [
    { title: '姓名', render: (_, r) => `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim() || '—' },
    { title: '邮箱', dataIndex: 'email' },
    { title: '电话', dataIndex: 'phone', render: (v) => v ?? '—' },
    { title: '来源', dataIndex: 'source', render: (v) => <Tag>{v ?? '—'}</Tag> },
    {
      title: 'VIP',
      dataIndex: 'vipLevel',
      render: (v: number) => (v > 0 ? <Tag color="gold">VIP {v}</Tag> : '—'),
    },
  ];

  return (
    <DashboardShell>
      <Card
        title="客户"
        extra={
          <Input.Search
            placeholder="搜索姓名/邮箱"
            allowClear
            onSearch={(v) => load(v)}
            style={{ width: 240 }}
          />
        }
      >
        <Table
          rowKey="id"
          loading={loading}
          dataSource={rows}
          columns={columns}
          onRow={(r) => ({
            style: { cursor: 'pointer' },
            onClick: () => router.push(`/crm/customers/${r.id}`),
          })}
          pagination={{ pageSize: 20 }}
        />
      </Card>
    </DashboardShell>
  );
}
