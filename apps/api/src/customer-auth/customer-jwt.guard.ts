import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

export interface CustomerTokenPayload {
  sub: string; // customer.id
  email: string;
  aud: 'customer';
}

export interface AuthenticatedCustomer {
  id: bigint;
  uuid: string;
  email: string;
}

/** 终端客户 JWT 守卫，保护 /customer/* 路由（与内部用户不同 secret 与 audience） */
@Injectable()
export class CustomerJwtGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new UnauthorizedException('Missing bearer token');

    let payload: CustomerTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<CustomerTokenPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_CUSTOMER_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    if (payload.aud !== 'customer') throw new UnauthorizedException('Wrong token audience');

    const customer = await this.prisma.customer.findFirst({
      where: { id: BigInt(payload.sub), deletedAt: null },
    });
    if (!customer) throw new UnauthorizedException('Customer not found');

    (request as Request & { customer: AuthenticatedCustomer }).customer = {
      id: customer.id,
      uuid: customer.uuid,
      email: customer.email,
    };
    return true;
  }
}

import { createParamDecorator } from '@nestjs/common';
export const CurrentCustomer = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedCustomer => {
    return ctx.switchToHttp().getRequest().customer as AuthenticatedCustomer;
  },
);
