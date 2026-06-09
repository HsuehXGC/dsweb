import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { IS_PUBLIC_KEY } from './public.decorator';
import type { AccessTokenPayload, AuthenticatedUser } from './auth.types';

/**
 * 内部用户 JWT 鉴权守卫（全局）。
 * 校验 Bearer token，加载用户的角色与权限点，注入 request.user。
 * 标记 @Public() 的路由跳过校验。
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_INTERNAL_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    if (payload.aud !== 'internal') {
      throw new UnauthorizedException('Wrong token audience');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: BigInt(payload.sub), isActive: true, deletedAt: null },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });
    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const authUser: AuthenticatedUser = {
      id: user.id,
      uuid: user.uuid,
      email: user.email,
      roleCode: user.role.code,
      permissions: user.role.permissions.map((rp) => rp.permission.code),
    };
    (request as Request & { user: AuthenticatedUser }).user = authUser;
    return true;
  }

  private extractToken(request: Request): string | null {
    const header = request.headers.authorization;
    if (!header) return null;
    const [type, token] = header.split(' ');
    return type === 'Bearer' && token ? token : null;
  }
}
