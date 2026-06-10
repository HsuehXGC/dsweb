/**
 * 补充填充 —— 在 seed-demo 基础上把各页面剩余空白填满：
 * 沟通记录(活动)、邮件群发、客服多轮对话、知识库、报价、推荐、额外订单/工单/订阅、CMS 页面。
 * 幂等：以「是否已有 activity」为标记，已填充则跳过。
 * 运行：pnpm db:seed:enrich
 */
import { Prisma, PrismaClient, PublishStatus } from '@prisma/client';

const prisma = new PrismaClient();
const D = (n: number | string) => new Prisma.Decimal(n);
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000);
const pad = (id: bigint) => String(id).padStart(5, '0');

async function main() {
  if ((await prisma.activity.count()) > 0) {
    console.log('▶ Enrichment already present, skipping.');
    return;
  }
  console.log('▶ Enriching demo data...');

  const customers = await prisma.customer.findMany({
    where: { deletedAt: null },
    include: { properties: true, deals: true },
    orderBy: { id: 'asc' },
  });
  const skuX1 = await prisma.sku.findUniqueOrThrow({ where: { code: 'SM-X1' } });
  const skuBlade = await prisma.sku.findUniqueOrThrow({ where: { code: 'ACC-BLADE' } });
  const skuRtk = await prisma.sku.findUniqueOrThrow({ where: { code: 'ACC-RTK' } });
  const tech = await prisma.technician.findFirst();
  const owner = await prisma.user.findFirstOrThrow({ where: { role: { code: 'super_admin' } } });

  // 1) 沟通记录（每客户 3 条，覆盖 call/email/meeting/note）
  const actTypes = ['call', 'email', 'meeting', 'note'] as const;
  const actSubjects = ['首次沟通', '报价跟进', '安装排期确认', '满意度回访', '续费提醒'];
  let actN = 0;
  for (const c of customers) {
    for (let i = 0; i < 3; i++) {
      await prisma.activity.create({
        data: {
          customerId: c.id,
          type: actTypes[i % actTypes.length],
          subject: actSubjects[i % actSubjects.length],
          body: `与 ${c.firstName ?? c.email} 的${actSubjects[i % actSubjects.length]}：沟通顺利，客户意向明确。`,
          userId: owner.id,
          occurredAt: daysAgo(i * 4 + 1),
        },
      });
      actN++;
    }
  }

  // 2) 邮件群发活动（4 个，混合状态）
  const campaigns = [
    { name: '春季开服促销', subject: '🌱 春季开服：会员首月 5 折', status: 'sent', recipients: 128 },
    { name: 'Burlington 体验日邀请', subject: '本周六来 Burlington 看机器人现场割草', status: 'sent', recipients: 96 },
    { name: '冬季封存提醒', subject: '入冬前为爱机做一次封存保养', status: 'draft', recipients: 0 },
    { name: '老客户推荐有礼', subject: '推荐邻居，双方各得 $50', status: 'draft', recipients: 0 },
  ];
  for (const c of campaigns) {
    await prisma.emailCampaign.create({
      data: {
        name: c.name,
        subject: c.subject,
        status: c.status,
        sentAt: c.status === 'sent' ? daysAgo(5) : null,
        stats: c.status === 'sent' ? ({ recipients: c.recipients, opened: Math.floor(c.recipients * 0.4), clicked: Math.floor(c.recipients * 0.12) } as Prisma.InputJsonValue) : undefined,
      },
    });
  }

  // 3) 客服工单多轮对话（给现有工单补回复 + 内部备注）
  const tickets = await prisma.supportTicket.findMany({ include: { messages: true } });
  for (const t of tickets) {
    await prisma.message.create({
      data: { ticketId: t.id, direction: 'internal_note', body: '已查阅客户档案，属常见配网问题，先引导自助。', authorId: owner.id, createdAt: daysAgo(1) },
    });
    await prisma.message.create({
      data: { ticketId: t.id, direction: 'outbound', body: '您好，请在 App 内「设置-网络」重新配网；如仍无法连接，我们可安排技师上门。', authorId: owner.id, createdAt: daysAgo(1) },
    });
  }

  // 4) 知识库（公共 FAQ）
  const kbs = [
    { category: 'setup', q: { en: 'How do I connect the mower to WiFi?', zh: '割草机器人如何连接 WiFi？' }, a: { en: 'Open the app and follow Network setup.', zh: '打开 App，按「网络设置」向导操作即可。' } },
    { category: 'service', q: { en: 'How often should blades be replaced?', zh: '刀片多久更换一次？' }, a: { en: 'Every 6–8 weeks in season.', zh: '旺季约每 6–8 周更换一次。' } },
    { category: 'billing', q: { en: 'Can I pause my membership?', zh: '可以暂停会员吗？' }, a: { en: 'Yes, up to 90 days from your account.', zh: '可以，会员中心可暂停最多 90 天。' } },
    { category: 'install', q: { en: 'What is RTK and do I need it?', zh: 'RTK 是什么，我需要吗？' }, a: { en: 'RTK gives centimeter-level navigation for complex yards.', zh: 'RTK 提供厘米级导航，适合复杂地块。' } },
    { category: 'winter', q: { en: 'What is winterization?', zh: '什么是冬季封存？' }, a: { en: 'End-of-season cleaning, storage and firmware update.', zh: '季末清洁、存放与固件更新。' } },
  ];
  for (let i = 0; i < kbs.length; i++) {
    await prisma.kbArticle.create({
      data: {
        category: kbs[i].category,
        isPublic: true,
        status: PublishStatus.published,
        question: kbs[i].q as Prisma.InputJsonValue,
        answer: kbs[i].a as Prisma.InputJsonValue,
        sort: i,
      },
    });
  }

  // 5) 报价单（给有商机的客户）
  const deals = await prisma.deal.findMany({ take: 4 });
  for (let i = 0; i < deals.length; i++) {
    const subtotal = 2000 + i * 800;
    const q = await prisma.quote.create({
      data: {
        number: 'tmp-' + i,
        dealId: deals[i].id,
        status: ['draft', 'sent', 'accepted', 'rejected'][i % 4],
        lineItems: [{ name: 'Robotic Mower X1', qty: 1, price: subtotal }] as Prisma.InputJsonValue,
        subtotal: D(subtotal),
        tax: D(Math.round(subtotal * 6.25) / 100),
        total: D(subtotal + Math.round(subtotal * 6.25) / 100),
        validUntil: new Date(Date.now() + 14 * 86400000),
      },
    });
    await prisma.quote.update({ where: { id: q.id }, data: { number: `QUO-2026-${pad(q.id)}` } });
  }

  // 6) 推荐关系
  if (customers.length >= 3) {
    await prisma.referral.create({
      data: { referrerCustomerId: customers[0].id, referredCustomerId: customers[2].id, code: 'REF-ALICE01', status: 'rewarded', rewardAmount: D(50) },
    });
    await prisma.referral.create({
      data: { referrerCustomerId: customers[1].id, code: 'REF-BOB0001', status: 'pending' },
    });
  }

  // 7) 给每个客户补 1 张历史完工工单 + 1 个额外订单（让 360 / 服务记录 / 订单更饱满）
  let woN = 0;
  let ordN = 0;
  const woTypes = ['assessment', 'install', 'maintenance', 'repair'] as const;
  for (let i = 0; i < customers.length; i++) {
    const c = customers[i];
    const prop = c.properties[0];
    if (tech) {
      const wo = await prisma.workOrder.create({
        data: {
          number: 'tmp-wo-' + i,
          type: woTypes[i % woTypes.length],
          status: 'completed',
          customerId: c.id,
          propertyId: prop?.id,
          technicianId: tech.id,
          scheduledAt: daysAgo(20 + i * 3),
          completedAt: daysAgo(20 + i * 3),
          serviceRecord: { notes: '服务完成，设备运行正常。' } as Prisma.InputJsonValue,
          reportPdfUrl: `/reports/demo-${i}.pdf`,
          totalCost: D(0),
        },
      });
      await prisma.workOrder.update({ where: { id: wo.id }, data: { number: `WO-2026-${pad(wo.id)}` } });
      woN++;
    }
    // 额外历史订单
    const sku = [skuBlade, skuRtk, skuX1][i % 3];
    const unit = Number(sku.price);
    const qty = i % 3 === 0 ? 2 : 1;
    const subtotal = unit * qty;
    const tax = Math.round(subtotal * 6.25) / 100;
    const order = await prisma.order.create({
      data: {
        number: 'tmp-ord-' + i,
        customerId: c.id,
        status: 'delivered',
        paymentStatus: 'paid',
        subtotal: D(subtotal), tax: D(tax), shipping: D(0), discount: D(0), total: D(subtotal + tax),
        paidAt: daysAgo(25 + i),
        placedAt: daysAgo(25 + i),
        items: { create: [{ skuId: sku.id, quantity: qty, unitPrice: D(unit), total: D(subtotal) }] },
      },
    });
    await prisma.order.update({ where: { id: order.id }, data: { number: `ORD-2026-${pad(order.id)}` } });
    ordN++;
  }

  // 8) 额外活跃订阅（第 2、4 个客户）
  for (const idx of [1, 3]) {
    if (customers[idx]) {
      const exists = await prisma.subscription.findFirst({ where: { customerId: customers[idx].id } });
      if (!exists) {
        await prisma.subscription.create({
          data: {
            customerId: customers[idx].id,
            status: idx === 3 ? 'past_due' : 'active',
            planPrice: D(80),
            interval: 'month',
            gatewayProfileToken: 'mock_profile_demo',
            currentPeriodEnd: new Date(Date.now() + 15 * 86400000),
            nextBillingAt: new Date(Date.now() + 15 * 86400000),
          },
        });
      }
    }
  }

  // 9) 额外 CMS 页面（让 CMS 列表更饱满）
  for (const p of [
    { slug: 'about', title: '关于我们 / About Us' },
    { slug: 'membership', title: 'SmartLawn 会员 / Membership' },
    { slug: 'service-area', title: '服务区域 / Service Area' },
  ]) {
    await prisma.page.upsert({
      where: { slug: p.slug },
      update: {},
      create: { slug: p.slug, title: p.title, status: PublishStatus.published, publishedAt: new Date() },
    });
  }

  // 10) 博客文章
  const posts = [
    { slug: 'spring-lawn-tips', cat: 'tips', title: 'Spring Lawn Care Tips' },
    { slug: 'robotic-vs-traditional', cat: 'guide', title: 'Robotic vs Traditional Mowing' },
    { slug: 'winterization-guide', cat: 'guide', title: 'Winterization Guide' },
  ];
  for (const p of posts) {
    await prisma.post.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        slug: p.slug,
        status: PublishStatus.published,
        category: p.cat,
        tags: ['lawn', 'robot'] as Prisma.InputJsonValue,
        content: { en: { title: p.title, body: 'Demo article body.' }, zh: { title: p.title, body: '演示文章正文。' } } as Prisma.InputJsonValue,
        publishedAt: daysAgo(10),
      },
    });
  }

  console.log(`✅ Enriched: ${actN} 活动, 4 邮件活动, ${tickets.length * 2} 客服消息, ${kbs.length} KB, ${deals.length} 报价, 推荐/订阅/${woN} 工单/${ordN} 订单/CMS页/博客.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
