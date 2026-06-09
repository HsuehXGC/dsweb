import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsArray, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { WorkOrdersService } from './work-orders.service';
import { RequirePermissions } from '../rbac/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';

class CreateWorkOrderDto {
  @IsString() type!: string;
  @IsString() customer_id!: string;
  @IsOptional() @IsString() property_id?: string;
  @IsOptional() @IsString() technician_id?: string;
  @IsOptional() @IsString() scheduled_at?: string;
  @IsOptional() @IsString() notes?: string;
}
class AssignDto {
  @IsOptional() @IsString() technician_id?: string | null;
}
class RescheduleDto {
  @IsString() scheduled_at!: string;
}
class CompleteDto {
  @IsOptional() @IsObject() service_record?: Record<string, unknown>;
  @IsOptional() @IsArray() photos?: string[];
  @IsOptional() @IsString() signature?: string;
  @IsOptional() @IsArray() parts_used?: Array<{ sku_code: string; quantity: number }>;
  @IsOptional() @IsNumber() total_cost?: number;
}
class CreateTechDto {
  @IsString() user_id!: string;
  @IsOptional() @IsArray() skills?: string[];
}

@ApiTags('work-orders-admin')
@ApiBearerAuth()
@Controller({ path: 'admin/work-orders', version: '1' })
export class WorkOrdersAdminController {
  constructor(private readonly wo: WorkOrdersService) {}

  @Get()
  @RequirePermissions('work_orders.read')
  list(
    @Query('status') status?: string,
    @Query('technician_id') technicianId?: string,
    @Query('customer_id') customerId?: string,
    @Query('date') date?: string,
  ) {
    return this.wo.list({ status, technicianId, customerId, date });
  }

  @Get('board')
  @RequirePermissions('work_orders.read')
  board(@Query('date') date?: string) {
    const d = date ?? new Date().toISOString().slice(0, 10);
    return this.wo.board(d);
  }

  @Get('technicians')
  @RequirePermissions('work_orders.read')
  technicians() {
    return this.wo.listTechnicians();
  }

  @Post('technicians')
  @RequirePermissions('work_orders.write')
  createTech(@Body() dto: CreateTechDto) {
    return this.wo.createTechnician(BigInt(dto.user_id), dto.skills);
  }

  @Get(':id')
  @RequirePermissions('work_orders.read')
  get(@Param('id') id: string) {
    return this.wo.get(BigInt(id));
  }

  @Post()
  @RequirePermissions('work_orders.write')
  create(@Body() dto: CreateWorkOrderDto) {
    return this.wo.create({
      type: dto.type,
      customerId: BigInt(dto.customer_id),
      propertyId: dto.property_id ? BigInt(dto.property_id) : undefined,
      technicianId: dto.technician_id ? BigInt(dto.technician_id) : undefined,
      scheduledAt: dto.scheduled_at ? new Date(dto.scheduled_at) : undefined,
      notes: dto.notes,
    });
  }

  @Patch(':id/assign')
  @RequirePermissions('work_orders.write')
  assign(@Param('id') id: string, @Body() dto: AssignDto) {
    return this.wo.assign(BigInt(id), dto.technician_id ? BigInt(dto.technician_id) : null);
  }

  @Patch(':id/reschedule')
  @RequirePermissions('work_orders.write')
  reschedule(@Param('id') id: string, @Body() dto: RescheduleDto) {
    return this.wo.reschedule(BigInt(id), new Date(dto.scheduled_at));
  }
}

/** 技师移动端 /tech/* —— 仅 Technician 角色（work_orders.read_own/write_own） */
@ApiTags('technician')
@ApiBearerAuth()
@Controller({ path: 'tech', version: '1' })
export class TechController {
  constructor(private readonly wo: WorkOrdersService) {}

  @Get('today')
  @RequirePermissions('work_orders.read_own')
  async today(@CurrentUser() user: AuthenticatedUser) {
    const tech = await this.wo.technicianByUser(user.id);
    return this.wo.today(tech.id);
  }

  @Post('work-orders/:id/clock/:event')
  @RequirePermissions('work_orders.write_own')
  async clock(
    @Param('id') id: string,
    @Param('event') event: 'arrived' | 'started' | 'completed',
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const tech = await this.wo.technicianByUser(user.id);
    return this.wo.clock(BigInt(id), tech.id, event);
  }

  @Post('work-orders/:id/complete')
  @RequirePermissions('work_orders.write_own')
  async complete(
    @Param('id') id: string,
    @Body() dto: CompleteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const tech = await this.wo.technicianByUser(user.id);
    return this.wo.complete(BigInt(id), tech.id, {
      serviceRecord: dto.service_record,
      photos: dto.photos,
      signature: dto.signature,
      partsUsed: dto.parts_used,
      totalCost: dto.total_cost,
    });
  }
}
