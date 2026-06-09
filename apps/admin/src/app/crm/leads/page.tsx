'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, Table, Tag, Button, Input, Space, message, Popconfirm } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DashboardShell } from '@/components/DashboardShell';
import { api } from '@/lib/api';

interface Lead {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  source: string | null;
  status: string;
  convertedCustomerId: string | null;
  createdAt: string;
}

const STATUS_COLOR: Record<string, string> = {
  new: 'blue',
  contacted: 'gold',
  qualified: 'green',
  converted: 'purple',
  lost: 'red',
};

export default function LeadsPage() {
  const [rows, setRows] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const load = useCallback(async (search = '') => {
    setLoading(true);
    try {
      const res = await api.listLeads(search ? { q: search } : {});
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

  const convert = async (id: string) => {
    try {
      await api.convertLead(id);
      message.success('已转为客户');
      await load(q);
    } catch (e) {
      message.error(e instanceof Error ? e.message : '转化失败');
    }
  };

  const columns: ColumnsType<Lead> = [
    {
      title: '姓名',
      render: (_, r) => `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim() || '—',
    },
    { title: '邮箱', dataIndex: 'email' },
    { title: '电话', dataIndex: 'phone', render: (v) => v ?? '—' },
    { title: '来源', dataIndex: 'source', render: (v) => <Tag>{v ?? '—'}</Tag> },
    {
      title: '状态',
      dataIndex: 'status',
      render: (v: string) => <Tag color={STATUS_COLOR[v] ?? 'default'}>{v}</Tag>,
    },
    {
      title: '操作',
      render: (_, r) =>
        r.convertedCustomerId ? (
          <Tag color="purple">已转客户</Tag>
        ) : (
          <Popconfirm title="把该线索转为客户？" onConfirm={() => convert(r.id)}>
            <Button type="link" size="small">
              转为客户
            </Button>
          </Popconfirm>
        ),
    },
  ];

  return (
    <DashboardShell>
      <Card
        title="线索池"
        extra={
          <Space>
            <Input.Search
              placeholder="搜索姓名/邮箱"
              allowClear
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onSearch={(v) => load(v)}
              style={{ width: 240 }}
            />
          </Space>
        }
      >
        <Table
          rowKey="id"
          loading={loading}
          dataSource={rows}
          columns={columns}
          pagination={{ pageSize: 20 }}
        />
      </Card>
    </DashboardShell>
  );
}
