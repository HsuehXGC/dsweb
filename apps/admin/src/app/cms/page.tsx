'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, Collapse, Input, Button, Space, Tag, Typography, message, Spin, Alert } from 'antd';
import { DashboardShell } from '@/components/DashboardShell';
import { api } from '@/lib/api';

const { Paragraph, Text } = Typography;

interface SectionState {
  blockId: string;
  type: string;
  enText: string;
  zhText: string;
}

const SECTION_LABELS: Record<string, string> = {
  hero: 'Hero 首屏',
  three_ways: '三模式入口',
  weekly_visit: '本周见面',
  how_it_works: '工作原理',
  customer_types: '客户类型',
  membership: '订阅会员',
  testimonials: '客户评价',
  service_area: '服务区域',
  final_cta: '底部 CTA',
};

export default function CmsPage() {
  const [loading, setLoading] = useState(true);
  const [pageId, setPageId] = useState<string | null>(null);
  const [sections, setSections] = useState<SectionState[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const pages = await api.listPages();
      const home = pages.find((p) => p.slug === 'home') ?? pages[0];
      if (!home) return;
      setPageId(home.id);
      const full = await api.getPage(home.id);
      setSections(
        full.sections.map((s) => {
          const block = s.blocks[0];
          const content = (block?.content ?? {}) as { en?: unknown; zh?: unknown };
          return {
            blockId: block?.id ?? '',
            type: s.type,
            enText: JSON.stringify(content.en ?? {}, null, 2),
            zhText: JSON.stringify(content.zh ?? {}, null, 2),
          };
        }),
      );
    } catch (e) {
      message.error(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const update = (idx: number, key: 'enText' | 'zhText', value: string) => {
    setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, [key]: value } : s)));
  };

  const save = async (s: SectionState) => {
    let en: unknown;
    let zh: unknown;
    try {
      en = JSON.parse(s.enText);
      zh = JSON.parse(s.zhText);
    } catch {
      message.error('JSON 格式有误，请检查后再保存');
      return;
    }
    setSavingId(s.blockId);
    try {
      await api.updateBlock(s.blockId, { en, zh });
      message.success('已保存，客户端刷新即见');
    } catch (e) {
      message.error(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <DashboardShell>
      <Card
        title="CMS 内容 · 主页"
        extra={
          pageId && (
            <a href="http://localhost:3000/en" target="_blank" rel="noreferrer">
              预览客户端 ↗
            </a>
          )
        }
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="编辑各 section 的中英文内容（JSON），保存后客户端主页刷新即可看到变化。"
        />
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin />
          </div>
        ) : (
          <Collapse
            accordion
            items={sections.map((s, idx) => ({
              key: s.blockId || String(idx),
              label: (
                <Space>
                  <Tag color="green">{SECTION_LABELS[s.type] ?? s.type}</Tag>
                  <Text type="secondary">{s.type}</Text>
                </Space>
              ),
              children: (
                <>
                  <Paragraph strong style={{ marginBottom: 4 }}>
                    English (en)
                  </Paragraph>
                  <Input.TextArea
                    value={s.enText}
                    onChange={(e) => update(idx, 'enText', e.target.value)}
                    autoSize={{ minRows: 4, maxRows: 16 }}
                    style={{ fontFamily: 'monospace', fontSize: 12 }}
                  />
                  <Paragraph strong style={{ margin: '12px 0 4px' }}>
                    中文 (zh)
                  </Paragraph>
                  <Input.TextArea
                    value={s.zhText}
                    onChange={(e) => update(idx, 'zhText', e.target.value)}
                    autoSize={{ minRows: 4, maxRows: 16 }}
                    style={{ fontFamily: 'monospace', fontSize: 12 }}
                  />
                  <Button
                    type="primary"
                    style={{ marginTop: 12 }}
                    loading={savingId === s.blockId}
                    onClick={() => save(s)}
                  >
                    保存
                  </Button>
                </>
              ),
            }))}
          />
        )}
      </Card>
    </DashboardShell>
  );
}
