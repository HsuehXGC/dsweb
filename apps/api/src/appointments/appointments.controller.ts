import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { Public } from '../auth/public.decorator';
import { RequirePermissions } from '../rbac/permissions.decorator';

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
}
