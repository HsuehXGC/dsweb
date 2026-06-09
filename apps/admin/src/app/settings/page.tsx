'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Card,
  Input,
  InputNumber,
  Button,
  Form,
  Spin,
  message,
  Typography,
  ColorPicker,
  Tag,
} from 'antd';
import type { Color } from 'antd/es/color-picker';
import { DashboardShell } from '@/components/DashboardShell';
import { api } from '@/lib/api';

const { Text } = Typography;

interface SettingItem {
  key: string;
  group: string;
  label: string;
  type: string;
  value?: unknown;
  isSet?: boolean;
  isSecret: boolean;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [groups, setGroups] = useState<Record<string, string>>({});
  const [items, setItems] = useState<SettingItem[]>([]);
  const [values, setValues] = useState<Record<string, unknown>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getSettings();
      setGroups(res.groups);
      setItems(res.settings);
      const v: Record<string, unknown> = {};
      for (const s of res.settings) {
        v[s.key] = s.isSecret ? '' : (s.value ?? '');
      }
      setValues(v);
    } catch (e) {
      message.error(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const set = (key: string, value: unknown) => setValues((p) => ({ ...p, [key]: value }));

  const save = async () => {
    // 敏感项为空 = 不修改，过滤掉
    const payload = items
      .map((it) => ({ key: it.key, value: values[it.key] }))
      .filter((e) => {
        const it = items.find((i) => i.key === e.key)!;
        if (it.isSecret) return typeof e.value === 'string' && e.value !== '';
        return true;
      });
    setSaving(true);
    try {
      await api.updateSettings(payload);
      message.success('已保存');
      await load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const renderField = (it: SettingItem) => {
    const v = values[it.key];
    switch (it.type) {
      case 'textarea':
        return (
          <Input.TextArea
            value={v as string}
            onChange={(e) => set(it.key, e.target.value)}
            autoSize={{ minRows: 2, maxRows: 4 }}
          />
        );
      case 'number':
        return (
          <InputNumber
            value={v as number}
            onChange={(n) => set(it.key, n)}
            style={{ width: 200 }}
          />
        );
      case 'color':
        return (
          <ColorPicker
            value={v as string}
            showText
            onChange={(c: Color) => set(it.key, c.toHexString())}
          />
        );
      case 'secret':
        return (
          <Input.Password
            value={v as string}
            onChange={(e) => set(it.key, e.target.value)}
            placeholder={it.isSet ? '已配置 · 留空保持不变' : '未配置'}
            autoComplete="new-password"
          />
        );
      default:
        return <Input value={v as string} onChange={(e) => set(it.key, e.target.value)} />;
    }
  };

  return (
    <DashboardShell>
      <Card
        title="系统配置"
        extra={
          <Button type="primary" loading={saving} onClick={save}>
            保存全部
          </Button>
        }
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin />
          </div>
        ) : (
          Object.entries(groups).map(([groupKey, groupLabel]) => (
            <div key={groupKey} style={{ marginBottom: 24 }}>
              <Text strong style={{ fontSize: 15 }}>
                {groupLabel}
              </Text>
              <Form layout="vertical" style={{ marginTop: 12, maxWidth: 520 }}>
                {items
                  .filter((it) => it.group === groupKey)
                  .map((it) => (
                    <Form.Item
                      key={it.key}
                      label={
                        <span>
                          {it.label}{' '}
                          {it.isSecret && (
                            <Tag color="orange" style={{ marginLeft: 4 }}>
                              加密
                            </Tag>
                          )}
                        </span>
                      }
                      style={{ marginBottom: 12 }}
                    >
                      {renderField(it)}
                    </Form.Item>
                  ))}
              </Form>
            </div>
          ))
        )}
      </Card>
    </DashboardShell>
  );
}
