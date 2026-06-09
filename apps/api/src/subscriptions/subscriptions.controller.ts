import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';
import { SubscriptionsService } from './subscriptions.service';
import { Public } from '../auth/public.decorator';
import { RequirePermissions } from '../rbac/permissions.decorator';
import {
  CurrentCustomer,
  CustomerJwtGuard,
  type AuthenticatedCustomer,
} from '../customer-auth/customer-jwt.guard';

class SubscribeDto {
  @IsString() product_slug!: string;
  @IsString() payment_token!: string;
}
class PauseDto {
  @IsOptional() @IsInt() days?: number;
}
class CancelDto {
  @IsOptional() @IsBoolean() immediate?: boolean;
}

@ApiTags('subscriptions-customer')
@ApiBearerAuth()
@Public() // 跳过内部用户守卫；由 CustomerJwtGuard 鉴权
@UseGuards(CustomerJwtGuard)
@Controller({ path: 'customer/subscriptions', version: '1' })
export class SubscriptionsCustomerController {
  constructor(private readonly subs: SubscriptionsService) {}

  @Post('subscribe')
  subscribe(@CurrentCustomer() c: AuthenticatedCustomer, @Body() dto: SubscribeDto) {
    return this.subs.subscribe(c.id, dto.product_slug, dto.payment_token);
  }

  @Post(':uuid/pause')
  pause(@CurrentCustomer() c: AuthenticatedCustomer, @Param('uuid') uuid: string, @Body() dto: PauseDto) {
    return this.subs.pause(c.id, uuid, dto.days ?? 30);
  }

  @Post(':uuid/resume')
  resume(@CurrentCustomer() c: AuthenticatedCustomer, @Param('uuid') uuid: string) {
    return this.subs.resume(c.id, uuid);
  }

  @Post(':uuid/cancel')
  cancel(@CurrentCustomer() c: AuthenticatedCustomer, @Param('uuid') uuid: string, @Body() dto: CancelDto) {
    return this.subs.cancel(c.id, uuid, dto.immediate ?? false);
  }
}

@ApiTags('subscriptions-admin')
@ApiBearerAuth()
@Controller({ path: 'admin', version: '1' })
export class SubscriptionsAdminController {
  constructor(private readonly subs: SubscriptionsService) {}

  @Get('subscriptions')
  @RequirePermissions('subscriptions.read')
  list() {
    return this.subs.listAdmin();
  }

  @Post('billing/run-due')
  @RequirePermissions('subscriptions.write')
  runDue() {
    return this.subs.runDueBilling();
  }
}
