import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PERMISSIONS_KEY } from './permissions.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';

/**
 * RBAC 权限守卫 —— 对应需求文档 4.3「中间件强制」。
 * 在 JwtAuthGuard 之后运行，检查 request.user.permissions 是否满足路由所需权限。
 * 支持通配：用户持有 "orders.*" 时即满足任何 "orders.xxx" 需求；
 *          "super_admin" 角色（持有 "*.*" 形式或全部权限）放行。
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Not authenticated');
    }

    const granted = new Set(user.permissions);
    const ok = required.some((perm) => this.has(granted, perm));
    if (!ok) {
      throw new ForbiddenException(`Missing permission: ${required.join(' | ')}`);
    }
    return true;
  }

  /** 检查权限集合是否覆盖某个具体权限点（支持资源级通配 *.* 与 resource.*） */
  private has(granted: Set<string>, perm: string): boolean {
    if (granted.has(perm) || granted.has('*.*')) {
      return true;
    }
    const [resource] = perm.split('.');
    return granted.has(`${resource}.*`);
  }
}
