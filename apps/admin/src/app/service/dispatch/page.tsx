'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, Tag, Select, DatePicker, Spin, message, Empty } from 'antd';
import { DashboardShell } from '@/components/DashboardShell';
import { api } from '@/lib/api';

const STATUS_COLOR: Record<string, string> = {
  scheduled: 'blue',
  in_progress: 'gold',
  completed: 'green',
  cancelled: 'default',
};

export default function DispatchPage() {
  const [columns, setColumns] = useState<any[]>([]);
  const [techs, setTechs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [board, technicians] = await Promise.all([api.dispatchBoard(date), api.listTechnicians()]);
      setColumns(board);
      setTechs(technicians);
    } catch (e) {
      message.error(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void load();
  }, [load]);

  const reassign = async (woId: string, techId: string | null) => {
    try {
      await api.assignWorkOrder(woId, techId);
      message.success('已改派');
      await load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '改派失败');
    }
  };

  const techOptions = [
    { value: '', label: '未分配' },
    ...techs.map((t) => ({
      value: t.id,
      label: `${t.user?.firstName ?? ''} ${t.user?.lastName ?? ''}`.trim() || `Tech ${t.id}`,
    })),
  ];

  return (
    <DashboardShell>
      <Card
        title="调度看板"
        extra={
          <DatePicker
            allowClear={false}
            onChange={(d) => d && setDate(d.format('YYYY-MM-DD'))}
          />
        }
        styles={{ body: { overflowX: 'auto' } }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>
        ) : (
          <div style={{ display: 'flex', gap: 12, minWidth: 900 }}>
            {columns.map((col) => (
              <div key={col.technicianId} style={{ flex: 1, minWidth: 220, background: '#f5f6f7', borderRadius: 8, padding: 10 }}>
                <div style={{ fontWeight: 600, color: '#1B4332', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span>{col.name}</span>
                  <Tag>{col.orders.length}</Tag>
                </div>
                {col.orders.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="" />}
                {col.orders.map((o: any) => (
                  <div key={o.id} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 6, padding: 10, marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 500 }}>{o.number}</span>
                      <Tag color={STATUS_COLOR[o.status]}>{o.status}</Tag>
                    </div>
                    <div style={{ fontSize: 12, color: '#888', margin: '4px 0' }}>
                      {o.type} · {o.customer?.firstName ?? ''} {o.customer?.lastName ?? ''}
                    </div>
                    <div style={{ fontSize: 12, color: '#888' }}>{o.property?.city ?? '—'}</div>
                    <Select
                      size="small"
                      value={o.technician ? String(o.technicianId) : ''}
                      style={{ width: '100%', marginTop: 6 }}
                      options={techOptions}
                      onChange={(v) => reassign(o.id, v || null)}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </Card>
    </DashboardShell>
  );
}
