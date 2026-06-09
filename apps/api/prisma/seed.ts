/**
 * M0 IAM 种子数据 —— 对应需求文档 4.1/4.2/4.3「初始数据」。
 * 预置：全部权限点 + 10 个标准角色 + 角色权限矩阵 + 1 个 Super Admin 账号。
 * 幂等：可重复执行（upsert）。
 */
import { Prisma, PrismaClient, PublishStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { HOMEPAGE_SECTIONS } from './homepage-content';

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

  console.log('✅ Seed complete.');
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
