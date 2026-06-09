import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { RequirePermissions } from '../rbac/permissions.decorator';

@ApiTags('analytics')
@ApiBearerAuth()
@Controller({ path: 'admin/analytics', version: '1' })
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('dashboard')
  @RequirePermissions('analytics.read')
  dashboard() {
    return this.analytics.dashboard();
  }

  @Get('conversion-funnel')
  @RequirePermissions('analytics.read')
  funnel() {
    return this.analytics.conversionFunnel();
  }

  @Get('sales-by-product')
  @RequirePermissions('analytics.read')
  sales() {
    return this.analytics.salesByProduct();
  }

  @Get('subscriptions')
  @RequirePermissions('analytics.read')
  subscriptions() {
    return this.analytics.subscriptionReport();
  }
}
