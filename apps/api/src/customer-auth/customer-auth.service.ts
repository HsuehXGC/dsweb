import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword, verifyPassword } from '../common/password.util';

@Injectable()
export class CustomerAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    locale?: string;
  }) {
    const existing = await this.prisma.customer.findUnique({ where: { email: data.email } });
    if (existing?.passwordHash) {
      throw new BadRequestException('Email already registered');
    }
    // 若该 email 已作为线索转化的客户存在（无密码），则补上密码完成激活
    const customer = existing
      ? await this.prisma.customer.update({
          where: { id: existing.id },
          data: {
            passwordHash: await hashPassword(data.password),
            firstName: data.firstName ?? existing.firstName,
            lastName: data.lastName ?? existing.lastName,
            phone: data.phone ?? existing.phone,
          },
        })
      : await this.prisma.customer.create({
          data: {
            email: data.email,
            passwordHash: await hashPassword(data.password),
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            locale: data.locale ?? 'en',
            source: 'web',
          },
        });
    return this.issueAndShape(customer);
  }

  async login(email: string, password: string) {
    const customer = await this.prisma.customer.findFirst({ where: { email, deletedAt: null } });
    if (!customer?.passwordHash || !(await verifyPassword(password, customer.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.issueAndShape(customer);
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string; aud: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_CUSTOMER_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (payload.aud !== 'customer_refresh') throw new UnauthorizedException('Wrong token');
    const customer = await this.prisma.customer.findFirst({
      where: { id: BigInt(payload.sub), deletedAt: null },
    });
    if (!customer) throw new UnauthorizedException('Customer not found');
    return this.issueAndShape(customer);
  }

  private async issueAndShape(customer: {
    id: bigint;
    uuid: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    locale: string;
  }) {
    const accessTtl = Number(this.config.get('JWT_ACCESS_TTL') ?? 3600);
    const refreshTtl = Number(this.config.get('JWT_REFRESH_TTL') ?? 604800);
    const secret = this.config.getOrThrow<string>('JWT_CUSTOMER_SECRET');
    const access_token = await this.jwt.signAsync(
      { sub: customer.id.toString(), email: customer.email, aud: 'customer' },
      { secret, expiresIn: accessTtl },
    );
    const refresh_token = await this.jwt.signAsync(
      { sub: customer.id.toString(), aud: 'customer_refresh' },
      { secret, expiresIn: refreshTtl },
    );
    return {
      access_token,
      refresh_token,
      expires_in: accessTtl,
      customer: {
        uuid: customer.uuid,
        email: customer.email,
        first_name: customer.firstName,
        last_name: customer.lastName,
        locale: customer.locale,
      },
    };
  }
}
