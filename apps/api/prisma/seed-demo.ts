/**
 * 演示数据 —— 在基础 seed 之上填充一套命名的真实感数据，便于 UI 演示/测试。
 * 幂等：以 demo 客户 email 为标记，已存在则整体跳过。
 * 运行：pnpm --filter @dsweb/api exec ts-node prisma/seed-demo.ts
 */
import { Prisma, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const D = (n: number | string) => new Prisma.Decimal(n);

async function num(table: 'orders' | 'work_orders' | 'appointments' | 'invoices' | 'support_tickets', prefix: string, id: bigint) {
  return `${prefix}-2026-${String(id).padStart(5, '0')}`;
}

async function main() {
  const MARKER = 'alice.reed@example.com';
  if (await prisma.customer.findUnique({ where: { email: MARKER } })) {
    console.log('▶ Demo data already present, skipping.');
    return;
  }
  console.log('▶ Seeding demo data...');

  const main = await prisma.warehouse.findFirstOrThrow({ where: { type: 'main' } });
  const skuX1 = await prisma.sku.findUniqueOrThrow({ where: { code: 'SM-X1' } });
  const skuBlade = await prisma.sku.findUniqueOrThrow({ where: { code: 'ACC-BLADE' } });
  const superRole = await prisma.role.findUniqueOrThrow({ where: { code: 'super_admin' } });
  const dispatcherRole = await prisma.role.findUniqueOrThrow({ where: { code: 'dispatcher' } });
  const techRole = await prisma.role.findUniqueOrThrow({ where: { code: 'technician' } });

  // 技师（内部用户 + technician 档案）
  const techUser = await prisma.user.upsert({
    where: { email: 'mike.tech@dssmartlawn.com' },
    update: {},
    create: {
      email: 'mike.tech@dssmartlawn.com',
      passwordHash: await bcrypt.hash('Tech1234!', 12),
      firstName: 'Mike',
      lastName: 'Field',
      roleId: techRole.id,
    },
  });
  const tech = await prisma.technician.upsert({
    where: { userId: techUser.id },
    update: {},
    create: { userId: techUser.id, skills: ['install', 'repair', 'maintenance'] as Prisma.InputJsonValue },
  });
  await prisma.user.upsert({
    where: { email: 'dana.dispatch@dssmartlawn.com' },
    update: {},
    create: {
      email: 'dana.dispatch@dssmartlawn.com',
      passwordHash: await bcrypt.hash('Dispatch1234!', 12),
      firstName: 'Dana',
      lastName: 'Route',
      roleId: dispatcherRole.id,
    },
  });

  // 客户（部分可登录会员中心）
  const memberHash = await bcrypt.hash('Demo1234!', 12);
  const customers = [
    { email: MARKER, first: 'Alice', last: 'Reed', city: 'Concord', acres: 2.5, password: memberHash, vip: 2, source: 'web' },
    { email: 'bob.kim@example.com', first: 'Bob', last: 'Kim', city: 'Sudbury', acres: 8, password: memberHash, vip: 0, source: 'demo_day' },
    { email: 'carol.diaz@example.com', first: 'Carol', last: 'Diaz', city: 'Carlisle', acres: 1.2, password: null, vip: 0, source: 'referral' },
    { email: 'dave.lin@example.com', first: 'Dave', last: 'Lin', city: 'Lincoln', acres: 15, password: null, vip: 1, source: 'web' },
    { email: 'erin.park@example.com', first: 'Erin', last: 'Park', city: 'Wayland', acres: 3, password: null, vip: 0, source: 'web' },
  ];
  const created: Record<string, { id: bigint; propertyId: bigint }> = {};
  for (const c of customers) {
    const customer = await prisma.customer.create({
      data: {
        email: c.email,
        firstName: c.first,
        lastName: c.last,
        passwordHash: c.password,
        phone: '+1-781-555-01' + Math.floor(10 + Math.random() * 89),
        source: c.source,
        vipLevel: c.vip,
        lifetimeValue: D(Math.floor(Math.random() * 5000)),
      },
    });
    const property = await prisma.property.create({
      data: {
        customerId: customer.id,
        street: `${Math.floor(1 + Math.random() * 99)} Maple St`,
        city: c.city,
        state: 'MA',
        zip: '017' + Math.floor(40 + Math.random() * 50),
        acres: D(c.acres),
        slope: ['flat', 'gentle', 'moderate'][Math.floor(Math.random() * 3)],
        wifiStatus: 'yes',
      },
    });
    created[c.email] = { id: customer.id, propertyId: property.id };
  }

  // 设备（给 Alice、Dave）
  for (const email of [MARKER, 'dave.lin@example.com']) {
    await prisma.device.create({
      data: {
        customerId: created[email].id,
        model: 'SmartLawn X1',
        serialNumber: 'SN-' + Math.floor(100000 + Math.random() * 899999),
        installedAt: new Date(Date.now() - 30 * 86400000),
        warrantyEnd: new Date(Date.now() + 700 * 86400000),
      },
    });
  }

  // 线索（各来源/状态）
  const leadData = [
    { first: 'Frank', last: 'Wu', email: 'frank.wu@example.com', source: 'web', status: 'new' },
    { first: 'Grace', last: 'Hall', email: 'grace.hall@example.com', source: 'demo_day', status: 'contacted' },
    { first: 'Henry', last: 'Cole', email: 'henry.cole@example.com', source: 'referral', status: 'qualified' },
    { first: 'Ivy', last: 'Ross', email: 'ivy.ross@example.com', source: 'web', status: 'lost' },
  ];
  for (const l of leadData) {
    await prisma.lead.create({
      data: { email: l.email, firstName: l.first, lastName: l.last, source: l.source, status: l.status, score: Math.floor(Math.random() * 100) },
    });
  }

  // 商机（流水线各阶段）
  const stages = ['lead', 'contacted', 'assessment', 'quote', 'signed', 'delivered'];
  const owner = await prisma.user.findFirstOrThrow({ where: { roleId: superRole.id } });
  let si = 0;
  for (const email of Object.keys(created)) {
    await prisma.deal.create({
      data: {
        customerId: created[email].id,
        title: `${customers.find((c) => c.email === email)?.first} 的草坪方案`,
        stage: stages[si % stages.length],
        amount: D(2000 + Math.floor(Math.random() * 4000)),
        ownerId: owner.id,
      },
    });
    si++;
  }

  // 订单（各状态）+ 发票
  const orderSpecs = [
    { email: MARKER, status: 'delivered', sku: skuX1, qty: 1 },
    { email: 'bob.kim@example.com', status: 'shipped', sku: skuX1, qty: 1 },
    { email: 'dave.lin@example.com', status: 'paid', sku: skuBlade, qty: 4 },
    { email: 'erin.park@example.com', status: 'pending', sku: skuBlade, qty: 2 },
  ];
  for (const o of orderSpecs) {
    const unit = Number(o.sku.price);
    const subtotal = unit * o.qty;
    const tax = Math.round(subtotal * 6.25) / 100;
    const total = subtotal + tax;
    const order = await prisma.order.create({
      data: {
        number: 'tmp-' + Math.random(),
        customerId: created[o.email].id,
        status: o.status,
        paymentStatus: o.status === 'pending' ? 'pending' : 'paid',
        subtotal: D(subtotal), tax: D(tax), shipping: D(0), discount: D(0), total: D(total),
        paidAt: o.status === 'pending' ? null : new Date(),
        items: { create: [{ skuId: o.sku.id, quantity: o.qty, unitPrice: D(unit), total: D(subtotal) }] },
      },
    });
    await prisma.order.update({ where: { id: order.id }, data: { number: await num('orders', 'ORD', order.id) } });
    if (o.status !== 'pending') {
      const inv = await prisma.invoice.create({ data: { number: 'tmp', orderId: order.id, status: 'paid', total: D(total), issuedAt: new Date() } });
      await prisma.invoice.update({ where: { id: inv.id }, data: { number: await num('invoices', 'INV', inv.id) } });
    }
  }

  // 订阅（Alice 活跃）
  await prisma.subscription.create({
    data: {
      customerId: created[MARKER].id,
      status: 'active',
      planPrice: D(80),
      interval: 'month',
      gatewayProfileToken: 'mock_profile_demo',
      currentPeriodEnd: new Date(Date.now() + 20 * 86400000),
      nextBillingAt: new Date(Date.now() + 20 * 86400000),
    },
  });

  // 预约（各类型/状态）
  const apptSpecs = [
    { email: 'frank.wu@example.com', type: 'standard', status: 'requested', name: 'Frank Wu', city: 'Acton' },
    { email: 'grace.hall@example.com', type: 'demo_day', status: 'requested', name: 'Grace Hall', city: 'Burlington' },
    { email: 'bob.kim@example.com', type: 'same_day', status: 'confirmed', name: 'Bob Kim', city: 'Sudbury' },
  ];
  for (const a of apptSpecs) {
    const appt = await prisma.appointment.create({
      data: {
        number: 'tmp-' + Math.random(),
        type: a.type as Prisma.AppointmentCreateInput['type'],
        status: a.status,
        contactName: a.name,
        contactEmail: a.email,
        contactPhone: '+1-781-555-0150',
        address: { street: '10 Oak Ave', city: a.city, state: 'MA', zip: '01776' } as Prisma.InputJsonValue,
        preferredDate: new Date(Date.now() + 3 * 86400000),
      },
    });
    await prisma.appointment.update({ where: { id: appt.id }, data: { number: await num('appointments', 'APT', appt.id) } });
  }

  // 工单（调度看板：今天，分配给 Mike，多状态）
  const today = new Date();
  const woSpecs = [
    { email: MARKER, type: 'maintenance', status: 'scheduled' },
    { email: 'bob.kim@example.com', type: 'install', status: 'in_progress' },
    { email: 'dave.lin@example.com', type: 'assessment', status: 'completed' },
  ];
  for (const w of woSpecs) {
    const wo = await prisma.workOrder.create({
      data: {
        number: 'tmp-' + Math.random(),
        type: w.type as Prisma.WorkOrderCreateInput['type'],
        status: w.status as Prisma.WorkOrderCreateInput['status'],
        customerId: created[w.email].id,
        propertyId: created[w.email].propertyId,
        technicianId: tech.id,
        scheduledAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9 + Math.floor(Math.random() * 6)),
        completedAt: w.status === 'completed' ? new Date() : null,
      },
    });
    await prisma.workOrder.update({ where: { id: wo.id }, data: { number: await num('work_orders', 'WO', wo.id) } });
  }

  // 客服工单
  const ticketSpecs = [
    { email: MARKER, subject: 'WiFi 连接问题', status: 'open', priority: 'high' },
    { email: 'dave.lin@example.com', subject: '刀片更换咨询', status: 'pending', priority: 'normal' },
  ];
  for (const tk of ticketSpecs) {
    const ticket = await prisma.supportTicket.create({
      data: {
        number: 'tmp-' + Math.random(),
        subject: tk.subject,
        channel: 'email',
        status: tk.status,
        priority: tk.priority,
        customerId: created[tk.email].id,
        slaDueAt: new Date(Date.now() + 86400000),
        messages: { create: { direction: 'inbound', body: `关于「${tk.subject}」的咨询，请帮忙看看。` } },
      },
    });
    await prisma.supportTicket.update({ where: { id: ticket.id }, data: { number: await num('support_tickets', 'TKT', ticket.id) } });
  }

  // 折扣码
  await prisma.discountCode.upsert({
    where: { code: 'WELCOME15' },
    update: {},
    create: { code: 'WELCOME15', type: 'percent', value: D(15), minAmount: D(50), isActive: true },
  });
  await prisma.discountCode.upsert({
    where: { code: 'SAVE50' },
    update: {},
    create: { code: 'SAVE50', type: 'fixed', value: D(50), minAmount: D(500), isActive: true },
  });

  console.log('✅ Demo data seeded: 5 customers, leads, deals, 4 orders, 1 subscription, 3 appointments, 3 work orders, 2 tickets, 2 discounts, 1 technician.');
  console.log('   会员登录：alice.reed@example.com / Demo1234!  |  技师登录：mike.tech@dssmartlawn.com / Tech1234!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
