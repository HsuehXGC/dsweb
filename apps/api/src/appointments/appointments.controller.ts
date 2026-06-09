import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { Public } from '../auth/public.decorator';
import { RequirePermissions } from '../rbac/permissions.decorator';

class CreateTimeSlotDto {
  @IsString() service_type!: string;
  @IsString() starts_at!: string;
  @IsString() ends_at!: string;
  @IsOptional() @IsInt() capacity?: number;
  @IsOptional() @IsString() region?: string;
}

@ApiTags('appointments-public')
@Controller({ path: 'public/appointments', version: '1' })
export class AppointmentsPublicController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: '提交预约（三种类型共用），创建线索并发确认邮件' })
  create(@Body() dto: CreateAppointmentDto) {
    return this.appointments.create(dto);
  }
}

@ApiTags('appointments-admin')
@ApiBearerAuth()
@Controller({ path: 'admin/appointments', version: '1' })
export class AppointmentsAdminController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Get()
  @RequirePermissions('appointments.read')
  list(
    @Query('page') page = '1',
    @Query('page_size') pageSize = '20',
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.appointments.list(Number(page) || 1, Number(pageSize) || 20, status, type);
  }

  @Post(':id/confirm')
  @RequirePermissions('appointments.write')
  confirm(@Param('id') id: string) {
    return this.appointments.confirm(BigInt(id));
  }

  @Get('time-slots')
  @RequirePermissions('appointments.read')
  listSlots(@Query('service_type') serviceType?: string) {
    return this.appointments.listTimeSlots(serviceType);
  }

  @Post('time-slots')
  @RequirePermissions('appointments.write')
  createSlot(@Body() dto: CreateTimeSlotDto) {
    return this.appointments.createTimeSlot({
      serviceType: dto.service_type,
      startsAt: new Date(dto.starts_at),
      endsAt: new Date(dto.ends_at),
      capacity: dto.capacity,
      region: dto.region,
    });
  }
}
