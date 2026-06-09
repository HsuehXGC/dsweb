import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { CustomerAuthService } from './customer-auth.service';
import { Public } from '../auth/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import {
  CurrentCustomer,
  CustomerJwtGuard,
  type AuthenticatedCustomer,
} from './customer-jwt.guard';

class RegisterDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
  @IsOptional() @IsString() first_name?: string;
  @IsOptional() @IsString() last_name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() locale?: string;
}
class LoginDto {
  @IsEmail() email!: string;
  @IsString() password!: string;
}
class RefreshDto {
  @IsString() refresh_token!: string;
}
class UpdateMeDto {
  @IsOptional() @IsString() first_name?: string;
  @IsOptional() @IsString() last_name?: string;
  @IsOptional() @IsString() phone?: string;
}

@ApiTags('customer-auth')
@Controller({ path: 'public/customer', version: '1' })
export class CustomerAuthController {
  constructor(private readonly auth: CustomerAuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register({
      email: dto.email,
      password: dto.password,
      firstName: dto.first_name,
      lastName: dto.last_name,
      phone: dto.phone,
      locale: dto.locale,
    });
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refresh_token);
  }
}

@ApiTags('member-center')
@ApiBearerAuth()
@Public() // 跳过内部用户全局守卫；改由 CustomerJwtGuard 强制客户鉴权
@UseGuards(CustomerJwtGuard)
@Controller({ path: 'customer', version: '1' })
export class MemberController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  async me(@CurrentCustomer() c: AuthenticatedCustomer) {
    const customer = await this.prisma.customer.findUniqueOrThrow({
      where: { id: c.id },
      select: {
        uuid: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        locale: true,
      },
    });
    return customer;
  }

  @Patch('me')
  updateMe(@CurrentCustomer() c: AuthenticatedCustomer, @Body() dto: UpdateMeDto) {
    return this.prisma.customer.update({
      where: { id: c.id },
      data: { firstName: dto.first_name, lastName: dto.last_name, phone: dto.phone },
      select: { uuid: true, email: true, firstName: true, lastName: true, phone: true },
    });
  }

  @Get('orders')
  orders(@CurrentCustomer() c: AuthenticatedCustomer) {
    return this.prisma.order.findMany({
      where: { customerId: c.id, deletedAt: null },
      orderBy: { placedAt: 'desc' },
      include: { items: { include: { sku: { include: { product: { select: { name: true } } } } } } },
    });
  }

  @Get('subscriptions')
  subscriptions(@CurrentCustomer() c: AuthenticatedCustomer) {
    return this.prisma.subscription.findMany({
      where: { customerId: c.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('devices')
  devices(@CurrentCustomer() c: AuthenticatedCustomer) {
    return this.prisma.device.findMany({
      where: { customerId: c.id },
      orderBy: { createdAt: 'desc' },
    });
  }
}
