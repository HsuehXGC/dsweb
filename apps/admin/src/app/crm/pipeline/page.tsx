'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, Tag, Spin, message, Empty } from 'antd';
import { DashboardShell } from '@/components/DashboardShell';
import { api } from '@/lib/api';

interface Deal {
  id: string;
  title: string;
  amount: string | null;
  stage: string;
  customer: { firstName: string | null; lastName: string | null; email: string } | null;
}
interface Column {
  stage: string;
  deals: Deal[];
}

const STAGE_LABELS: Record<string, string> = {
  lead: '线索',
  contacted: '已联系',
  assessment: '评估',
  quote: '报价',
  signed: '签约',
  delivered: '交付',
};

export default function PipelinePage() {
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setColumns(await api.getBoard());
    } catch (e) {
      message.error(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const drop = async (stage: string) => {
    setOverStage(null);
    if (!dragId) return;
    const current = columns.find((c) => c.deals.some((d) => d.id === dragId));
    if (current?.stage === stage) return;
    // 乐观更新
    setColumns((cols) => {
      const deal = cols.flatMap((c) => c.deals).find((d) => d.id === dragId);
      if (!deal) return cols;
      return cols.map((c) => ({
        ...c,
        deals:
          c.stage === stage
            ? [{ ...deal, stage }, ...c.deals.filter((d) => d.id !== dragId)]
            : c.deals.filter((d) => d.id !== dragId),
      }));
    });
    try {
      await api.updateDeal(dragId, { stage });
      message.success(`已移至「${STAGE_LABELS[stage]}」`);
    } catch (e) {
      message.error(e instanceof Error ? e.message : '更新失败');
      await load();
    } finally {
      setDragId(null);
    }
  };

  return (
    <DashboardShell>
      <Card title="销售流水线" styles={{ body: { overflowX: 'auto' } }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin />
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 12, minWidth: 1000 }}>
            {columns.map((col) => (
              <div
                key={col.stage}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverStage(col.stage);
                }}
                onDrop={() => drop(col.stage)}
                style={{
                  flex: 1,
                  minWidth: 180,
                  background: overStage === col.stage ? '#e7f2ec' : '#f5f6f7',
                  borderRadius: 8,
                  padding: 8,
                  transition: 'background 0.15s',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '4px 8px 8px',
                    fontWeight: 600,
                    color: '#1B4332',
                  }}
                >
                  <span>{STAGE_LABELS[col.stage] ?? col.stage}</span>
                  <Tag>{col.deals.length}</Tag>
                </div>
                {col.deals.length === 0 && (
                  <div style={{ padding: '16px 0' }}>
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="" />
                  </div>
                )}
                {col.deals.map((deal) => (
                  <div
                    key={deal.id}
                    draggable
                    onDragStart={() => setDragId(deal.id)}
                    onDragEnd={() => setDragId(null)}
                    style={{
                      background: '#fff',
                      border: '1px solid #eee',
                      borderRadius: 6,
                      padding: 10,
                      marginBottom: 8,
                      cursor: 'grab',
                      boxShadow: dragId === deal.id ? '0 4px 12px rgba(0,0,0,0.12)' : 'none',
                    }}
                  >
                    <div style={{ fontWeight: 500 }}>{deal.title}</div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                      {deal.customer
                        ? `${deal.customer.firstName ?? ''} ${deal.customer.lastName ?? ''}`.trim() ||
                          deal.customer.email
                        : '—'}
                    </div>
                    {deal.amount && (
                      <div style={{ fontSize: 13, color: '#1B4332', marginTop: 4 }}>
                        ${deal.amount}
                      </div>
                    )}
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
