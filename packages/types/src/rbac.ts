/**
 * RBAC 角色与权限定义 —— 对应需求文档 第四章「角色与权限矩阵」。
 * 这些是系统预置的标准角色（seed 脚本写入），后续可在 Super Admin 后台微调。
 */

/** 10 个预置标准角色的 code（数据库 roles.code） */
export const ROLE = {
  SUPER_ADMIN: 'super_admin',
  OPS_MANAGER: 'ops_manager',
  SALES: 'sales',
  CUSTOMER_SERVICE: 'customer_service',
  TECHNICIAN: 'technician',
  DISPATCHER: 'dispatcher',
  INVENTORY_MANAGER: 'inventory_manager',
  FINANCE: 'finance',
  CONTENT_EDITOR: 'content_editor',
  READONLY_ANALYST: 'readonly_analyst',
} as const;

export type RoleCode = (typeof ROLE)[keyof typeof ROLE];

/**
 * 权限点以「资源.动作」为最小粒度，例如 customers.read / customers.write。
 * 资源对应业务模块，动作为标准 CRUD + 业务动作。
 */
export const PERMISSION_RESOURCE = {
  USERS: 'users',
  ROLES: 'roles',
  AUDIT_LOGS: 'audit_logs',
  CUSTOMERS: 'customers',
  LEADS: 'leads',
  PROPERTIES: 'properties',
  DEALS: 'deals',
  QUOTES: 'quotes',
  CMS: 'cms',
  PRODUCTS: 'products',
  INVENTORY: 'inventory',
  ORDERS: 'orders',
  SUBSCRIPTIONS: 'subscriptions',
  PAYMENTS: 'payments',
  FINANCE: 'finance',
  SUPPORT_TICKETS: 'support_tickets',
  WORK_ORDERS: 'work_orders',
  APPOINTMENTS: 'appointments',
  MARKETING: 'marketing',
  ANALYTICS: 'analytics',
  SETTINGS: 'settings',
} as const;

export type PermissionResource =
  (typeof PERMISSION_RESOURCE)[keyof typeof PERMISSION_RESOURCE];

export const PERMISSION_ACTION = {
  READ: 'read',
  WRITE: 'write',
  DELETE: 'delete',
  /** 行级「自有」权限：只能读写自己负责的记录（如 Sales 只见自己客户） */
  READ_OWN: 'read_own',
  WRITE_OWN: 'write_own',
  /** 业务动作 */
  CREATE: 'create',
  APPROVE: 'approve',
  EXPORT: 'export',
} as const;

export type PermissionAction =
  (typeof PERMISSION_ACTION)[keyof typeof PERMISSION_ACTION];

/** 一个权限点字符串，如 "customers.read" */
export type Permission = `${PermissionResource}.${PermissionAction}` | `${PermissionResource}.*`;
