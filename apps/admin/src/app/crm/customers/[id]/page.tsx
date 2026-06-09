'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  Descriptions,
  Tabs,
  Table,
  Tag,
  Spin,
  Timeline,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Empty,
} from 'antd';
import { DashboardShell } from '@/components/DashboardShell';
import { api } from '@/lib/api';

type Any = Record<string, any>;

export default function Customer360Page() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [data, setData] = useState<Any | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api.getCustomer(id));
    } catch (e) {
      message.error(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const logActivity = async (values: { type: string; subject?: string; body?: string }) => {
    try {
      await api.createActivity({ customer_id: id, ...values });
      message.success('已记录');
      setModalOpen(false);
      form.resetFields();
      await load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '记录失败');
    }
  };

  if (loading || !data) {
    return (
      <DashboardShell>
        <div style={{ textAlign: 'center', padding: 64 }}>
          <Spin size="large" />
        </div>
      </DashboardShell>
    );
  }

  const fullName = `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim() || data.email;

  return (
    <DashboardShell>
      <Button type="link" style={{ paddingLeft: 0 }} onClick={() => router.push('/crm/customers')}>
        ← 返回客户列表
      </Button>
      <Card title={`客户 · ${fullName}`} style={{ marginTop: 8 }}>
        <Descriptions bordered size="small" column={2}>
          <Descriptions.Item label="邮箱">{data.email}</Descriptions.Item>
          <Descriptions.Item label="电话">{data.phone ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="来源">
            <Tag>{data.source ?? '—'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="VIP 等级">{data.vipLevel ?? 0}</Descriptions.Item>
          <Descriptions.Item label="终身价值">${data.lifetimeValue ?? '0.00'}</Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {new Date(data.createdAt).toLocaleString()}
          </Descriptions.Item>
        </Descriptions>

        <Tabs
          style={{ marginTop: 16 }}
          items={[
            {
              key: 'deals',
              label: `商机 (${data.deals.length})`,
              children: (
                <Table
                  rowKey="id"
                  size="small"
                  pagination={false}
                  dataSource={data.deals}
                  locale={{ emptyText: <Empty description="暂无商机" /> }}
                  columns={[
                    { title: '标题', dataIndex: 'title' },
                    { title: '阶段', dataIndex: 'stage', render: (v) => <Tag color="green">{v}</Tag> },
                    { title: '金额', dataIndex: 'amount', render: (v) => (v ? `$${v}` : '—') },
                  ]}
                />
              ),
            },
            {
              key: 'properties',
              label: `地块 (${data.properties.length})`,
              children: (
                <Table
                  rowKey="id"
                  size="small"
                  pagination={false}
                  dataSource={data.properties}
                  locale={{ emptyText: <Empty description="暂无地块" /> }}
                  columns={[
                    { title: '标签', dataIndex: 'label', render: (v) => v ?? '—' },
                    {
                      title: '地址',
                      render: (_, r: Any) =>
                        [r.street, r.city, r.state, r.zip].filter(Boolean).join(', ') || '—',
                    },
                    { title: '面积', dataIndex: 'acres', render: (v) => (v ? `${v} ac` : '—') },
                    { title: '坡度', dataIndex: 'slope', render: (v) => v ?? '—' },
                  ]}
                />
              ),
            },
            {
              key: 'orders',
              label: `订单 (${data.orders.length})`,
              children: (
                <Table
                  rowKey="id"
                  size="small"
                  pagination={false}
                  dataSource={data.orders}
                  locale={{ emptyText: <Empty description="暂无订单" /> }}
                  columns={[
                    { title: '单号', dataIndex: 'number' },
                    { title: '状态', dataIndex: 'status', render: (v) => <Tag>{v}</Tag> },
                    { title: '金额', dataIndex: 'total', render: (v) => `$${v}` },
                  ]}
                />
              ),
            },
            {
              key: 'devices',
              label: `设备 (${data.devices.length})`,
              children: (
                <Table
                  rowKey="id"
                  size="small"
                  pagination={false}
                  dataSource={data.devices}
                  locale={{ emptyText: <Empty description="暂无设备" /> }}
                  columns={[
                    { title: '型号', dataIndex: 'model' },
                    { title: '序列号', dataIndex: 'serialNumber' },
                  ]}
                />
              ),
            },
            {
              key: 'activities',
              label: `沟通记录 (${data.activities.length})`,
              children: (
                <>
                  <Button type="primary" size="small" onClick={() => setModalOpen(true)}>
                    + 记录沟通
                  </Button>
                  <div style={{ marginTop: 16 }}>
                    {data.activities.length === 0 ? (
                      <Empty description="暂无沟通记录" />
                    ) : (
                      <Timeline
                        items={data.activities.map((a: Any) => ({
                          children: (
                            <div>
                              <Tag>{a.type}</Tag> <strong>{a.subject ?? ''}</strong>
                              <div style={{ color: '#888' }}>{a.body}</div>
                              <div style={{ fontSize: 12, color: '#bbb' }}>
                                {new Date(a.occurredAt).toLocaleString()}
                              </div>
                            </div>
                          ),
                        }))}
                      />
                    )}
                  </div>
                </>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title="记录沟通"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText="保存"
      >
        <Form form={form} layout="vertical" onFinish={logActivity}>
          <Form.Item name="type" label="类型" rules={[{ required: true }]} initialValue="call">
            <Select
              options={[
                { value: 'call', label: '电话' },
                { value: 'email', label: '邮件' },
                { value: 'meeting', label: '会面' },
                { value: 'note', label: '备注' },
              ]}
            />
          </Form.Item>
          <Form.Item name="subject" label="主题">
            <Input />
          </Form.Item>
          <Form.Item name="body" label="内容">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </DashboardShell>
  );
}
