import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { MarketingService } from './marketing.service';
import { RequirePermissions } from '../rbac/permissions.decorator';
import { Public } from '../auth/public.decorator';
import {
  CurrentCustomer,
  CustomerJwtGuard,
  type AuthenticatedCustomer,
} from '../customer-auth/customer-jwt.guard';

class CreateDiscountDto {
  @IsString() code!: string;
  @IsOptional() @IsString() type?: string;
  @IsNumber() value!: number;
  @IsOptional() @IsNumber() min_amount?: number;
  @IsOptional() @IsNumber() max_uses?: number;
  @IsOptional() @IsBoolean() members_only?: boolean;
  @IsOptional() @IsString() expires_at?: string;
}
class ToggleDto {
  @IsBoolean() is_active!: boolean;
}
class CreateCampaignDto {
  @IsString() name!: string;
  @IsString() subject!: string;
  @IsOptional() @IsObject() segment?: Record<string, unknown>;
}
class SendCampaignDto {
  @IsString() body!: string;
}

@ApiTags('marketing')
@ApiBearerAuth()
@Controller({ path: 'admin/marketing', version: '1' })
export class MarketingController {
  constructor(private readonly marketing: MarketingService) {}

  @Get('discounts')
  @RequirePermissions('marketing.read')
  listDiscounts() {
    return this.marketing.listDiscounts();
  }

  @Post('discounts')
  @RequirePermissions('marketing.write')
  createDiscount(@Body() dto: CreateDiscountDto) {
    return this.marketing.createDiscount({
      code: dto.code,
      type: dto.type,
      value: dto.value,
      minAmount: dto.min_amount,
      maxUses: dto.max_uses,
      membersOnly: dto.members_only,
      expiresAt: dto.expires_at ? new Date(dto.expires_at) : undefined,
    });
  }

  @Patch('discounts/:id/toggle')
  @RequirePermissions('marketing.write')
  toggle(@Param('id') id: string, @Body() dto: ToggleDto) {
    return this.marketing.toggleDiscount(BigInt(id), dto.is_active);
  }

  @Get('referrals')
  @RequirePermissions('marketing.read')
  referrals() {
    return this.marketing.listReferrals();
  }

  @Get('campaigns')
  @RequirePermissions('marketing.read')
  campaigns() {
    return this.marketing.listCampaigns();
  }

  @Post('campaigns')
  @RequirePermissions('marketing.write')
  createCampaign(@Body() dto: CreateCampaignDto) {
    return this.marketing.createCampaign(dto);
  }

  @Post('campaigns/:id/send')
  @RequirePermissions('marketing.write')
  send(@Param('id') id: string, @Body() dto: SendCampaignDto) {
    return this.marketing.sendCampaign(BigInt(id), dto.body);
  }
}

/** 客户推荐码（会员中心） */
@ApiTags('referral-customer')
@ApiBearerAuth()
@Public()
@UseGuards(CustomerJwtGuard)
@Controller({ path: 'customer/referral', version: '1' })
export class ReferralCustomerController {
  constructor(private readonly marketing: MarketingService) {}

  @Get()
  myReferral(@CurrentCustomer() c: AuthenticatedCustomer) {
    return this.marketing.referralForCustomer(c.id);
  }
}
