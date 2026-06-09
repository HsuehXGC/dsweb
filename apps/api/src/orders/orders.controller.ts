import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { OrdersService } from './orders.service';
import { RequirePermissions } from '../rbac/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';

class UpdateStatusDto {
  @IsString() status!: string;
}

@ApiTags('orders-admin')
@ApiBearerAuth()
@Controller({ path: 'admin/orders', version: '1' })
export class OrdersAdminController {
  constructor(
    private readonly orders: OrdersService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @RequirePermissions('orders.read')
  list(
    @Query('page') page = '1',
    @Query('page_size') pageSize = '20',
    @Query('status') status?: string,
  ) {
    return this.orders.list({ page: Number(page) || 1, pageSize: Number(pageSize) || 20, status });
  }

  @Get(':id')
  @RequirePermissions('orders.read')
  get(@Param('id') id: string) {
    return this.orders.get(BigInt(id));
  }

  @Patch(':id/status')
  @RequirePermissions('orders.write')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const o = await this.orders.updateStatus(BigInt(id), dto.status);
    await this.audit.record({
      userId: user.id,
      action: 'update',
      entity: 'orders',
      entityId: id,
      changes: { status: dto.status },
    });
    return o;
  }
}
