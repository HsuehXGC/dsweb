'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, Table, Tag, Button, Popconfirm, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DashboardShell } from '@/components/DashboardShell';
import { api } from '@/lib/api';

const TYPE_COLOR: Record<string, string> = { standard: 'blue', demo_day: 'gold', same_day: 'red', install: 'green', repair: 'orange' };
const STATUS_COLOR: Record<string, string> = { requested: 'gold', confirmed: 'green', cancelled: 'default', completed: 'purple' };

export default function AppointmentsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await api.listAppointments());
    } catch (e) {
      message.error(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const confirm = async (id: string) => {
    try {
      const r = await api.confirmAppointment(id);
      message.success(`已确认，生成工单 ${r.work_order_number}`);
      await load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '确认失败');
    }
  };

  const columns: ColumnsType<any> = [
    { title: '预约号', dataIndex: 'number' },
    { title: '联系人', dataIndex: 'contactName', render: (v) => v ?? '—' },
    { title: '邮箱', dataIndex: 'contactEmail', render: (v) => v ?? '—' },
    { title: '类型', dataIndex: 'type', render: (v) => <Tag color={TYPE_COLOR[v]}>{v}</Tag> },
    { title: '城镇', render: (_, r) => r.address?.city ?? r.preferredTown ?? '—' },
    { title: '状态', dataIndex: 'status', render: (v) => <Tag color={STATUS_COLOR[v]}>{v}</Tag> },
    {
      title: '操作',
      render: (_, r) =>
        r.status === 'requested' ? (
          <Popconfirm title="确认预约并生成工单？" onConfirm={() => confirm(r.id)}>
            <Button type="link" size="small">确认 → 转工单</Button>
          </Popconfirm>
        ) : (
          <span style={{ color: '#bbb' }}>—</span>
        ),
    },
  ];

  return (
    <DashboardShell>
      <Card title="预约审批">
        <Table rowKey="id" loading={loading} dataSource={rows} columns={columns} pagination={{ pageSize: 15 }} />
      </Card>
    </DashboardShell>
  );
}
