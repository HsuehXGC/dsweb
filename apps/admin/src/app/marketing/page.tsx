'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, Table, Tag, Button, Modal, Form, Input, InputNumber, Switch, message } from 'antd';
import { DashboardShell } from '@/components/DashboardShell';
import { api } from '@/lib/api';

export default function MarketingPage() {
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [discountModal, setDiscountModal] = useState(false);
  const [campaignModal, setCampaignModal] = useState(false);
  const [dForm] = Form.useForm();
  const [cForm] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, c] = await Promise.all([api.listDiscounts(), api.listCampaigns()]);
      setDiscounts(d);
      setCampaigns(c);
    } catch (e) {
      message.error(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createDiscount = async (v: any) => {
    try {
      await api.createDiscount(v);
      message.success('已创建');
      setDiscountModal(false);
      dForm.resetFields();
      await load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '创建失败');
    }
  };

  const createCampaign = async (v: any) => {
    try {
      const c: any = await api.createCampaign({ name: v.name, subject: v.subject });
      await api.sendCampaign(c.id, v.body);
      message.success('已创建并发送');
      setCampaignModal(false);
      cForm.resetFields();
      await load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '操作失败');
    }
  };

  return (
    <DashboardShell>
      <Card
        title="折扣码"
        style={{ marginBottom: 16 }}
        extra={<Button type="primary" onClick={() => setDiscountModal(true)}>新建折扣码</Button>}
      >
        <Table
          rowKey="id"
          loading={loading}
          dataSource={discounts}
          pagination={false}
          columns={[
            { title: '码', dataIndex: 'code', render: (v) => <code>{v}</code> },
            { title: '类型', dataIndex: 'type', render: (v) => <Tag>{v}</Tag> },
            { title: '值', dataIndex: 'value', render: (v, r) => (r.type === 'percent' ? `${v}%` : `$${v}`) },
            { title: '最低金额', dataIndex: 'minAmount', render: (v) => (v ? `$${v}` : '—') },
            { title: '已用', dataIndex: 'usedCount' },
            {
              title: '启用',
              dataIndex: 'isActive',
              render: (v, r) => (
                <Switch
                  size="small"
                  checked={v}
                  onChange={async (checked) => {
                    await api.toggleDiscount(r.id, checked);
                    await load();
                  }}
                />
              ),
            },
          ]}
        />
      </Card>

      <Card
        title="邮件群发"
        extra={<Button type="primary" onClick={() => setCampaignModal(true)}>新建群发</Button>}
      >
        <Table
          rowKey="id"
          loading={loading}
          dataSource={campaigns}
          pagination={false}
          columns={[
            { title: '名称', dataIndex: 'name' },
            { title: '主题', dataIndex: 'subject' },
            { title: '状态', dataIndex: 'status', render: (v) => <Tag color={v === 'sent' ? 'green' : 'default'}>{v}</Tag> },
            { title: '收件人', dataIndex: 'stats', render: (s) => s?.recipients ?? '—' },
          ]}
        />
      </Card>

      <Modal title="新建折扣码" open={discountModal} onCancel={() => setDiscountModal(false)} onOk={() => dForm.submit()}>
        <Form form={dForm} layout="vertical" onFinish={createDiscount}>
          <Form.Item name="code" label="折扣码" rules={[{ required: true }]}><Input placeholder="SPRING10" /></Form.Item>
          <Form.Item name="type" label="类型" initialValue="percent"><Input /></Form.Item>
          <Form.Item name="value" label="值" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="min_amount" label="最低金额"><InputNumber style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="新建邮件群发" open={campaignModal} onCancel={() => setCampaignModal(false)} onOk={() => cForm.submit()} okText="创建并发送">
        <Form form={cForm} layout="vertical" onFinish={createCampaign}>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="subject" label="邮件主题" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="body" label="正文" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </DashboardShell>
  );
}
