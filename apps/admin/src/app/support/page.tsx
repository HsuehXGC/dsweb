'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, List, Tag, Input, Button, Select, Empty, Spin, message, Divider } from 'antd';
import { DashboardShell } from '@/components/DashboardShell';
import { api } from '@/lib/api';

const STATUS_COLOR: Record<string, string> = {
  open: 'gold',
  pending: 'blue',
  resolved: 'green',
  closed: 'default',
};

export default function SupportPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const t = await api.listTickets();
      setTickets(t);
      if (!selectedId && t[0]) setSelectedId(t[0].id);
    } catch (e) {
      message.error(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  const loadDetail = useCallback(async (id: string) => {
    try {
      setDetail(await api.getTicket(id));
    } catch (e) {
      message.error(e instanceof Error ? e.message : '加载失败');
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const sendReply = async (internal: boolean) => {
    if (!selectedId || !reply.trim()) return;
    setSending(true);
    try {
      await api.replyTicket(selectedId, reply, internal);
      setReply('');
      await loadDetail(selectedId);
      await loadList();
      message.success(internal ? '已添加内部备注' : '已回复并发送邮件');
    } catch (e) {
      message.error(e instanceof Error ? e.message : '发送失败');
    } finally {
      setSending(false);
    }
  };

  const setStatus = async (status: string) => {
    if (!selectedId) return;
    await api.updateTicket(selectedId, { status });
    await loadDetail(selectedId);
    await loadList();
  };

  const c = detail?.customer;

  return (
    <DashboardShell>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* 收件箱列表 */}
        <Card title="收件箱" style={{ width: 320, flexShrink: 0 }} styles={{ body: { padding: 0 } }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
          ) : (
            <List
              dataSource={tickets}
              renderItem={(t) => (
                <List.Item
                  onClick={() => setSelectedId(t.id)}
                  style={{
                    cursor: 'pointer',
                    padding: 12,
                    background: selectedId === t.id ? '#e7f2ec' : undefined,
                  }}
                >
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 500 }}>{t.subject}</span>
                      <Tag color={STATUS_COLOR[t.status]}>{t.status}</Tag>
                    </div>
                    <div style={{ fontSize: 12, color: '#888' }}>
                      {t.number} · {t.customer?.email ?? '匿名'}
                    </div>
                  </div>
                </List.Item>
              )}
            />
          )}
        </Card>

        {/* 详情 */}
        <Card style={{ flex: 1 }} title={detail ? `${detail.number} · ${detail.subject}` : '工单详情'}
          extra={detail && (
            <Select size="small" value={detail.status} style={{ width: 120 }} onChange={setStatus}
              options={['open', 'pending', 'resolved', 'closed'].map((s) => ({ value: s, label: s }))} />
          )}>
          {!detail ? (
            <Empty description="选择一个工单" />
          ) : (
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1 }}>
                {/* 对话 */}
                <div style={{ maxHeight: 360, overflowY: 'auto', marginBottom: 12 }}>
                  {detail.messages.map((m: any) => (
                    <div key={m.id} style={{ marginBottom: 10, textAlign: m.direction === 'inbound' ? 'left' : 'right' }}>
                      <div style={{
                        display: 'inline-block', maxWidth: '80%', padding: '8px 12px', borderRadius: 8,
                        background: m.direction === 'inbound' ? '#f5f5f5' : m.direction === 'internal_note' ? '#fffbe6' : '#e7f2ec',
                        textAlign: 'left',
                      }}>
                        {m.direction === 'internal_note' && <Tag color="orange">内部</Tag>}
                        <div>{m.body}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <Input.TextArea rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="输入回复…" />
                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                  <Button type="primary" loading={sending} onClick={() => sendReply(false)}>回复客户</Button>
                  <Button onClick={() => sendReply(true)}>内部备注</Button>
                </div>
              </div>
              {/* 一屏客户视图 */}
              <div style={{ width: 220, flexShrink: 0 }}>
                <Divider style={{ margin: '0 0 8px' }}>客户视图</Divider>
                {c ? (
                  <div style={{ fontSize: 13 }}>
                    <p><strong>{c.email}</strong></p>
                    <p style={{ color: '#888' }}>订单 {c.orders?.length ?? 0} · 工单 {c.workOrders?.length ?? 0} · 设备 {c.devices?.length ?? 0}</p>
                    {c.orders?.slice(0, 3).map((o: any) => (
                      <div key={o.number} style={{ color: '#666' }}>{o.number} · {o.status} · ${o.total}</div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#bbb' }}>匿名访客</p>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    </DashboardShell>
  );
}
