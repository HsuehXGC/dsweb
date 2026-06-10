'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  Descriptions,
  Table,
  Tag,
  Button,
  Select,
  Spin,
  Modal,
  Form,
  Input,
  InputNumber,
  message,
  Space,
  Alert,
} from 'antd';
import { DashboardShell } from '@/components/DashboardShell';
import { api } from '@/lib/api';

const STATUS = ['pending', 'paid', 'preparing', 'shipped', 'delivered', 'refunded', 'cancelled'];
const STATUS_COLOR: Record<string, string> = {
  pending: 'gold', paid: 'green', preparing: 'cyan', shipped: 'blue', delivered: 'purple', refunded: 'red', cancelled: 'default',
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<any | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [techs, setTechs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deviceModal, setDeviceModal] = useState(false);
  const [woModal, setWoModal] = useState(false);
  const [dForm] = Form.useForm();
  const [wForm] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [o, u, t] = await Promise.all([
        api.getOrder(id),
        api.listUsers().catch(() => []),
        api.listTechnicians().catch(() => []),
      ]);
      setOrder(o);
      setUsers(Array.isArray(u) ? u : []);
      setTechs(t);
    } catch (e) {
      message.error(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading || !order) {
    return (
      <DashboardShell>
        <div style={{ textAlign: 'center', padding: 64 }}><Spin size="large" /></div>
      </DashboardShell>
    );
  }

  const fulfillment = order.shippingAddress?.method as string | undefined;
  const isPickup = fulfillment === 'pickup';
  const addr = order.shippingAddress ?? {};
  const customerName = `${order.customer?.firstName ?? ''} ${order.customer?.lastName ?? ''}`.trim() || order.customer?.email;

  const setStatus = async (status: string) => {
    await api.updateOrderStatus(id, status);
    message.success('状态已更新');
    await load();
  };
  const assignOwner = async (ownerId: string) => {
    await api.assignOrderOwner(id, ownerId);
    message.success('已分配业务员');
    await load();
  };
  const submitDevice = async (v: any) => {
    await api.registerDevice(String(order.customer.id), { model: v.model, serial_number: v.serial_number, warranty_months: v.warranty_months });
    message.success('设备已登记到客户');
    setDeviceModal(false); dForm.resetFields();
  };
  const submitWo = async (v: any) => {
    await api.createWorkOrder({
      type: v.type,
      customer_id: String(order.customer.id),
      technician_id: v.technician_id || undefined,
      scheduled_at: v.scheduled_at || undefined,
      notes: `${isPickup ? '到店自提+培训' : '送货上门+安装'} · 订单 ${order.number}` + (v.notes ? ` · ${v.notes}` : ''),
    });
    message.success('交付工单已创建（可在调度看板查看）');
    setWoModal(false); wForm.resetFields();
  };

  const ownerName = (() => {
    if (!order.ownerId) return undefined;
    const u = users.find((x) => String(x.id ?? x.uuid) === String(order.ownerId));
    return u ? (u.email ?? `${u.first_name ?? ''} ${u.last_name ?? ''}`) : `#${order.ownerId}`;
  })();

  return (
    <DashboardShell>
      <Button type="link" style={{ paddingLeft: 0 }} onClick={() => router.push('/erp/orders')}>← 返回订单列表</Button>

      <Card
        title={<span>订单 {order.number} <Tag color={STATUS_COLOR[order.status]} style={{ marginLeft: 8 }}>{order.status}</Tag></span>}
        style={{ marginTop: 8 }}
        extra={
          <Space>
            <span style={{ color: '#888' }}>状态</span>
            <Select size="small" value={order.status} style={{ width: 130 }} onChange={setStatus}
              options={STATUS.map((s) => ({ value: s, label: s }))} />
          </Space>
        }
      >
        {/* 履约方式高亮 */}
        <Alert
          type={isPickup ? 'success' : 'info'}
          showIcon
          message={isPickup ? '🏬 Burlington 门店自提 + 现场培训（免运费）' : '🚚 送货上门 + 安装'}
          description={
            isPickup
              ? `自提地点：${addr.location ?? 'Burlington, MA'}　·　含上手培训`
              : `收货地址：${[addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(', ') || '（未填写）'}`
          }
          style={{ marginBottom: 16 }}
        />

        <Descriptions bordered size="small" column={2}>
          <Descriptions.Item label="客户">
            <a onClick={() => router.push(`/crm/customers/${order.customer.id}`)}>{customerName}</a>
          </Descriptions.Item>
          <Descriptions.Item label="邮箱">{order.customer?.email}</Descriptions.Item>
          <Descriptions.Item label="类型">{order.type}</Descriptions.Item>
          <Descriptions.Item label="下单时间">{new Date(order.placedAt).toLocaleString()}</Descriptions.Item>
          <Descriptions.Item label="归属业务员">
            <Select
              size="small" style={{ minWidth: 200 }} placeholder="分配业务员"
              value={order.ownerId ? String(order.ownerId) : undefined}
              onChange={assignOwner}
              options={users.map((u) => ({ value: String(u.id ?? u.uuid), label: u.email ?? `${u.first_name ?? ''} ${u.last_name ?? ''}` }))}
            />
            {ownerName && <span style={{ marginLeft: 8, color: '#888' }}>{ownerName}</span>}
          </Descriptions.Item>
          <Descriptions.Item label="支付">
            {order.payments?.[0] ? <Tag color="green">{order.payments[0].status} · ${order.payments[0].amount}</Tag> : '—'}
            {order.invoices?.[0] && <Tag>{order.invoices[0].number}</Tag>}
          </Descriptions.Item>
        </Descriptions>

        {/* 明细 */}
        <Table
          style={{ marginTop: 16 }}
          rowKey="id" size="small" pagination={false}
          dataSource={order.items}
          columns={[
            { title: '商品', render: (_, r: any) => r.sku?.product?.name ?? r.sku?.code },
            { title: 'SKU', render: (_, r: any) => <code>{r.sku?.code}</code> },
            { title: '数量', dataIndex: 'quantity' },
            { title: '单价', dataIndex: 'unitPrice', render: (v) => `$${v}` },
            { title: '小计', dataIndex: 'total', render: (v) => `$${v}` },
          ]}
          summary={() => (
            <Table.Summary>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={4} align="right">小计 / 税 / 运费 / 合计</Table.Summary.Cell>
                <Table.Summary.Cell index={1}>
                  ${order.subtotal} / ${order.tax} / ${order.shipping} / <strong>${order.total}</strong>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />

        {/* 业务处理动作 */}
        <Space style={{ marginTop: 20 }} wrap>
          <Button type="primary" onClick={() => setWoModal(true)}>
            {isPickup ? '创建培训工单' : '创建交付工单'} →
          </Button>
          <Button onClick={() => setDeviceModal(true)}>登记设备（序列号+保修）</Button>
        </Space>
      </Card>

      {/* 派工 */}
      <Modal title={isPickup ? '创建培训工单' : '创建交付工单'} open={woModal} onCancel={() => setWoModal(false)} onOk={() => wForm.submit()} okText="创建">
        <Form form={wForm} layout="vertical" onFinish={submitWo}>
          <Form.Item name="type" label="工单类型" initialValue="install" rules={[{ required: true }]}>
            <Select options={[
              { value: 'install', label: '安装/交付' },
              { value: 'maintenance', label: '维护' },
              { value: 'assessment', label: '评估' },
            ]} />
          </Form.Item>
          <Form.Item name="technician_id" label="指派技师">
            <Select allowClear placeholder="可稍后在调度看板分配"
              options={techs.map((t) => ({ value: String(t.id), label: `${t.user?.firstName ?? ''} ${t.user?.lastName ?? ''}`.trim() || `Tech ${t.id}` }))} />
          </Form.Item>
          <Form.Item name="scheduled_at" label="计划时间">
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item name="notes" label="备注"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      {/* 登记设备 */}
      <Modal title="登记设备" open={deviceModal} onCancel={() => setDeviceModal(false)} onOk={() => dForm.submit()} okText="登记">
        <Form form={dForm} layout="vertical" onFinish={submitDevice}>
          <Form.Item name="model" label="型号" initialValue={order.items?.[0]?.sku?.product?.name} rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="serial_number" label="序列号" rules={[{ required: true }]}><Input placeholder="SN-XXXXXX" /></Form.Item>
          <Form.Item name="warranty_months" label="保修月数" initialValue={24}><InputNumber style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>
    </DashboardShell>
  );
}
