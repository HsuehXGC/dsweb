import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'requiredPermissions';

/**
 * 声明访问该路由所需的权限点（任一满足即可，OR 语义）。
 * 例：@RequirePermissions('customers.write')
 * 通配 "customers.*" 由守卫负责匹配。
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
