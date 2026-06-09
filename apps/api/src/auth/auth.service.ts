import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { verifyPassword } from '../common/password.util';
import type { AccessTokenPayload } from './auth.types';

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

interface LoginContext {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(email: string, password: string, ctx: LoginContext) {
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      include: { role: true },
    });
    // 统一错误信息，避免暴露账号是否存在
    if (!user || !user.isActive || !(await verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.issueTokens(user.id, user.email, user.role.code, ctx);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      ...tokens,
      user: {
        uuid: user.uuid,
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
        role: user.role.code,
      },
    };
  }

  async refresh(refreshToken: string, ctx: LoginContext): Promise<TokenPair> {
    const session = await this.prisma.session.findUnique({
      where: { refreshToken },
      include: { user: { include: { role: true } } },
    });
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt < new Date() ||
      !session.user.isActive ||
      session.user.deletedAt
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // 轮换：撤销旧会话，签发新会话（refresh token rotation）
    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    return this.issueTokens(session.user.id, session.user.email, session.user.role.code, ctx);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { refreshToken, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokens(
    userId: bigint,
    email: string,
    roleCode: string,
    ctx: LoginContext,
  ): Promise<TokenPair> {
    const accessTtl = Number(this.config.get('JWT_ACCESS_TTL') ?? 3600);
    const refreshTtl = Number(this.config.get('JWT_REFRESH_TTL') ?? 604800);

    const payload: AccessTokenPayload = {
      sub: userId.toString(),
      email,
      role: roleCode,
      aud: 'internal',
    };
    const access_token = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_INTERNAL_SECRET'),
      expiresIn: accessTtl,
    });

    const refresh_token = randomBytes(48).toString('hex');
    await this.prisma.session.create({
      data: {
        userId,
        refreshToken: refresh_token,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        expiresAt: new Date(Date.now() + refreshTtl * 1000),
      },
    });

    return { access_token, refresh_token, expires_in: accessTtl };
  }
}
