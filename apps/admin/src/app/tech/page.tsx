'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Tag, Spin, Empty, Modal, Input, message } from 'antd';
import { api } from '@/lib/api';
import { session } from '@/lib/session';

const { TextArea } = Input;

export default function TechPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<any | null>(null);
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setJobs(await api.techToday());
    } catch (e) {
      message.error(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!session.token) {
      router.replace('/login');
      return;
    }
    setReady(true);
    void load();
  }, [router, load]);

  if (!ready) return null;

  const clock = async (id: string, event: 'arrived' | 'started' | 'completed') => {
    try {
      await api.techClock(id, event);
      message.success(event === 'arrived' ? '已到达' : '已开始');
      await load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '操作失败');
    }
  };

  const submitComplete = async () => {
    if (!completing) return;
    try {
      await api.techComplete(completing.id, {
        service_record: { notes },
        signature: 'data:image/png;base64,demo',
      });
      message.success('已完工');
      setCompleting(null);
      setNotes('');
      await load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '完工失败');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F4F8F5' }}>
      <header style={{ background: '#1B4332', color: '#fff', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>今日工单</strong>
        <Button size="small" onClick={() => { session.clear(); router.replace('/login'); }}>退出</Button>
      </header>
      <div style={{ padding: 16, maxWidth: 560, margin: '0 auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>
        ) : jobs.length === 0 ? (
          <Empty description="今天没有工单" style={{ marginTop: 48 }} />
        ) : (
          jobs.map((j) => (
            <Card key={j.id} size="small" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>{j.number}</strong>
                <Tag color={j.status === 'in_progress' ? 'gold' : 'blue'}>{j.status}</Tag>
              </div>
              <div style={{ margin: '6px 0', color: '#555' }}>
                {j.type} · {j.customer?.firstName ?? ''} {j.customer?.lastName ?? ''}
              </div>
              {j.property && (
                <div style={{ color: '#888', fontSize: 13 }}>
                  📍 {[j.property.street, j.property.city, j.property.zip].filter(Boolean).join(', ')}
                  {j.property.city && (
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent([j.property.street, j.property.city, j.property.state].filter(Boolean).join(' '))}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ marginLeft: 8 }}
                    >
                      导航
                    </a>
                  )}
                </div>
              )}
              <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                <Button size="small" onClick={() => clock(j.id, 'arrived')}>到达</Button>
                {j.status === 'scheduled' && (
                  <Button size="small" type="primary" onClick={() => clock(j.id, 'started')}>开始</Button>
                )}
                {j.status === 'in_progress' && (
                  <Button size="small" type="primary" onClick={() => setCompleting(j)}>完工</Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      <Modal title={`完工 · ${completing?.number ?? ''}`} open={!!completing} onCancel={() => setCompleting(null)} onOk={submitComplete} okText="提交完工">
        <p style={{ color: '#888' }}>现场表单（演示：填写备注；照片/签名/配件领用为完整版字段）</p>
        <TextArea rows={4} placeholder="现场记录…" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Modal>
    </div>
  );
}
