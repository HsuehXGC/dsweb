/**
 * M0 IAM 种子数据 —— 对应需求文档 4.1/4.2/4.3「初始数据」。
 * 预置：全部权限点 + 10 个标准角色 + 角色权限矩阵 + 1 个 Super Admin 账号。
 * 幂等：可重复执行（upsert）。
 */
import { Prisma, PrismaClient, PublishStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { HOMEPAGE_SECTIONS } from './homepage-content';
import { SETTINGS_CATALOG } from '../src/settings/settings.catalog';

const prisma = new PrismaClient();

// 业务资源（与 packages/types/src/rbac.ts 对齐）
const RESOURCES = [
  'users',
  'roles',
  'audit_logs',
  'customers',
  'leads',
  'properties',
  'deals',
  'quotes',
  'cms',
  'products',
  'inventory',
  'orders',
  'subscriptions',
  'payments',
  'finance',
  'support_tickets',
  'work_orders',
  'appointments',
  'marketing',
  'analytics',
  'settings',
];

const ACTIONS = ['read', 'write', 'delete'];
// 额外的业务/行级动作
const EXTRA: Record<string, string[]> = {
  customers: ['read_own', 'write_own'],
  orders: ['read_own', 'write_own', 'approve'],
  work_orders: ['create', 'read_own', 'write_own'],
  refunds: ['create', 'approve'],
  finance: ['approve'],
  support_tickets: ['create'],
  analytics: ['export'],
};

// 角色 → 权限码集合（'*.*' = 全权限；'resource.*' = 该资源全部动作）
const ROLE_PERMISSIONS: Record<string, { name: string; perms: string[] }> = {
  super_admin: { name: 'Super Admin', perms: ['*.*'] },
  ops_manager: {
    name: 'Operations Manager',
    perms: [
      'customers.*', 'leads.*', 'properties.*', 'deals.*', 'quotes.*',
      'cms.*', 'products.*', 'inventory.*', 'orders.*', 'subscriptions.*',
      'support_tickets.*', 'work_orders.*', 'appointments.*', 'marketing.*',
      'payments.read', 'finance.read', 'analytics.read', 'analytics.export',
      'audit_logs.read',
    ],
  },
  sales: {
    name: 'Sales',
    perms: [
      'customers.read', 'customers.write', 'leads.*', 'properties.*',
      'deals.*', 'quotes.*', 'orders.read_own', 'orders.write_own',
      'appointments.read', 'products.read',
    ],
  },
  customer_service: {
    name: 'Customer Service',
    perms: [
      'support_tickets.*', 'customers.read', 'work_orders.create',
      'appointments.read', 'products.read', 'refunds.create',
    ],
  },
  technician: {
    name: 'Technician',
    perms: ['work_orders.read_own', 'work_orders.write_own', 'inventory.read', 'appointments.read'],
  },
  dispatcher: {
    name: 'Dispatcher',
    perms: ['work_orders.*', 'appointments.*', 'customers.read', 'properties.read'],
  },
  inventory_manager: {
    name: 'Inventory Manager',
    perms: ['products.*', 'inventory.*'],
  },
  finance: {
    name: 'Finance',
    perms: [
      'finance.*', 'payments.*', 'refunds.create', 'refunds.approve',
      'orders.read', 'orders.write', 'orders.approve', 'analytics.read',
    ],
  },
  content_editor: {
    name: 'Content Editor',
    perms: ['cms.*', 'marketing.*'],
  },
  readonly_analyst: {
    name: 'Read-Only Analyst',
    perms: [
      'analytics.read', 'analytics.export', 'customers.read', 'orders.read',
      'work_orders.read', 'deals.read', 'inventory.read', 'finance.read',
    ],
  },
};

function parseCode(code: string): { resource: string; action: string } {
  const [resource, action] = code.split('.');
  return { resource, action };
}

async function ensurePermission(code: string): Promise<bigint> {
  const { resource, action } = parseCode(code);
  const perm = await prisma.permission.upsert({
    where: { code },
    update: {},
    create: { code, resource, action },
  });
  return perm.id;
}

async function main() {
  console.log('▶ Seeding permissions...');
  // 1) 生成全部标准权限码
  const allCodes = new Set<string>(['*.*']);
  for (const r of RESOURCES) {
    for (const a of ACTIONS) allCodes.add(`${r}.${a}`);
    allCodes.add(`${r}.*`);
  }
  for (const [r, actions] of Object.entries(EXTRA)) {
    for (const a of actions) allCodes.add(`${r}.${a}`);
  }
  // 角色里引用到的也要存在
  for (const { perms } of Object.values(ROLE_PERMISSIONS)) {
    for (const p of perms) allCodes.add(p);
  }
  const codeToId = new Map<string, bigint>();
  for (const code of allCodes) {
    codeToId.set(code, await ensurePermission(code));
  }
  console.log(`  ${codeToId.size} permissions ensured.`);

  console.log('▶ Seeding roles + matrix...');
  for (const [code, { name, perms }] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { code },
      update: { name, isSystem: true },
      create: { code, name, isSystem: true, description: `系统预置角色：${name}` },
    });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: perms.map((p) => ({ roleId: role.id, permissionId: codeToId.get(p)! })),
      skipDuplicates: true,
    });
    console.log(`  ${code} → ${perms.length} perms`);
  }

  console.log('▶ Seeding Super Admin user...');
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@dssmartlawn.com';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';
  const superRole = await prisma.role.findUniqueOrThrow({ where: { code: 'super_admin' } });
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash: await bcrypt.hash(password, 12),
      firstName: 'Super',
      lastName: 'Admin',
      roleId: superRole.id,
    },
  });
  console.log(`  Super Admin: ${email} / ${password}  (请尽快修改密码)`);

  await seedHomepage();
  await seedSettings();
  await seedErp();

  console.log('✅ Seed complete.');
}

/** 预置 ERP 样例数据：主仓 + 产品/SKU + 库存。幂等。 */
async function seedErp() {
  console.log('▶ Seeding ERP (products/inventory)...');
  const main = await prisma.warehouse.upsert({
    where: { code: 'WH-MAIN' },
    update: {},
    create: { code: 'WH-MAIN', name: '主仓库', type: 'main' },
  });
  await prisma.warehouse.upsert({
    where: { code: 'WH-VEHICLE-1' },
    update: {},
    create: { code: 'WH-VEHICLE-1', name: '1号车上库存', type: 'vehicle' },
  });

  const products: Array<{
    slug: string;
    name: string;
    type: 'one_time' | 'subscription';
    basePrice: number;
    description: { en: string; zh: string };
    sku: string;
    stock: number;
  }> = [
    {
      slug: 'robotic-mower-x1',
      name: 'SmartLawn Robotic Mower X1',
      type: 'one_time',
      basePrice: 2999,
      description: {
        en: 'RTK-guided robotic mower for yards up to 1.5 acres. Handles slopes and tight edges.',
        zh: 'RTK 导航割草机器人，适用 1.5 英亩以内庭院，可应对坡地与狭窄边缘。',
      },
      sku: 'SM-X1',
      stock: 25,
    },
    {
      slug: 'robotic-mower-x2-pro',
      name: 'SmartLawn Robotic Mower X2 Pro',
      type: 'one_time',
      basePrice: 4499,
      description: {
        en: 'Pro model for large properties up to 5 acres, with multi-zone mapping.',
        zh: '专业型，适用 5 英亩以内大型地块，支持多区域地图。',
      },
      sku: 'SM-X2',
      stock: 12,
    },
    {
      slug: 'rtk-base-station',
      name: 'RTK Base Station',
      type: 'one_time',
      basePrice: 499,
      description: { en: 'Precision RTK base station for centimeter-level navigation.', zh: '厘米级导航 RTK 基站。' },
      sku: 'ACC-RTK',
      stock: 40,
    },
    {
      slug: 'blade-replacement-set',
      name: 'Blade Replacement Set (9-pack)',
      type: 'one_time',
      basePrice: 59,
      description: { en: 'Genuine replacement blades, 9-pack.', zh: '原厂替换刀片，9 片装。' },
      sku: 'ACC-BLADE',
      stock: 200,
    },
    {
      slug: 'smartlawn-membership',
      name: 'SmartLawn Membership',
      type: 'subscription',
      basePrice: 80,
      description: {
        en: 'Monthly membership: priority service, diagnostics, seasonal maintenance, winterization.',
        zh: '月度会员：优先服务、远程诊断、季节维护、冬季封存。',
      },
      sku: 'MEM-MONTHLY',
      stock: 0,
    },
  ];

  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: { name: p.name, basePrice: new Prisma.Decimal(p.basePrice), isActive: true },
      create: {
        slug: p.slug,
        name: p.name,
        type: p.type,
        basePrice: new Prisma.Decimal(p.basePrice),
        description: p.description as Prisma.InputJsonValue,
        isActive: true,
      },
    });
    const sku = await prisma.sku.upsert({
      where: { code: p.sku },
      update: { price: new Prisma.Decimal(p.basePrice) },
      create: { productId: product.id, code: p.sku, price: new Prisma.Decimal(p.basePrice) },
    });
    if (p.type === 'one_time') {
      await prisma.inventory.upsert({
        where: { skuId_warehouseId: { skuId: sku.id, warehouseId: main.id } },
        update: { available: p.stock },
        create: { skuId: sku.id, warehouseId: main.id, available: p.stock, lowWatermark: 5 },
      });
    }
  }
  console.log(`  ${products.length} products + inventory seeded.`);
}

/** 预置系统配置默认值（仅非敏感项；敏感项留空待管理员填写）。幂等。 */
async function seedSettings() {
  console.log('▶ Seeding settings (M9)...');
  let n = 0;
  for (const def of SETTINGS_CATALOG) {
    if (def.type === 'secret') continue; // 敏感项不预置
    await prisma.setting.upsert({
      where: { key: def.key },
      update: {},
      create: { key: def.key, value: def.default as Prisma.InputJsonValue, isEncrypted: false },
    });
    n++;
  }
  console.log(`  ${n} settings ensured.`);
}

/** 预置主页（slug=home）+ 9 个 section + 双语内容 block。幂等：重置后重建。 */
async function seedHomepage() {
  console.log('▶ Seeding homepage (CMS)...');
  const page = await prisma.page.upsert({
    where: { slug: 'home' },
    update: { status: PublishStatus.published, publishedAt: new Date() },
    create: {
      slug: 'home',
      title: 'DS SmartLawn — Home',
      status: PublishStatus.published,
      publishedAt: new Date(),
      seoTitle:
        'Robotic Lawn Mower Service & Installation in Eastern Massachusetts | DS SmartLawn',
      seoDesc:
        'Locally owned robotic lawn care for large yards, hobby farms, and country properties across Eastern MA. Free on-site assessment available.',
    },
  });

  // 重置该页 section（连带 block 级联删除），按内容重建
  await prisma.section.deleteMany({ where: { pageId: page.id } });
  let sort = 0;
  for (const s of HOMEPAGE_SECTIONS) {
    const section = await prisma.section.create({
      data: {
        pageId: page.id,
        type: s.type,
        sort: sort++,
        config: (s.config ?? {}) as Prisma.InputJsonValue,
      },
    });
    await prisma.block.create({
      data: {
        sectionId: section.id,
        type: s.type,
        sort: 0,
        content: s.content as Prisma.InputJsonValue,
      },
    });
  }
  console.log(`  Homepage: ${HOMEPAGE_SECTIONS.length} sections seeded.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
