import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RequirePermissions } from '../rbac/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller({ path: 'admin/users', version: '1' })
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @RequirePermissions('users.read')
  list(@Query('page') page = '1', @Query('page_size') pageSize = '20') {
    return this.users.list(Number(page) || 1, Number(pageSize) || 20);
  }

  @Post()
  @RequirePermissions('users.write')
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const created = await this.users.create(dto);
    await this.audit.record({
      userId: actor.id,
      action: 'create',
      entity: 'users',
      entityId: created.uuid,
      changes: { email: dto.email, role: dto.role_code },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return created;
  }

  @Patch(':id')
  @RequirePermissions('users.write')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const updated = await this.users.update(BigInt(id), dto);
    await this.audit.record({
      userId: actor.id,
      action: 'update',
      entity: 'users',
      entityId: id,
      changes: dto as unknown,
    });
    return updated;
  }

  @Post(':id/deactivate')
  @RequirePermissions('users.write')
  async deactivate(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    const result = await this.users.deactivate(BigInt(id));
    await this.audit.record({
      userId: actor.id,
      action: 'update',
      entity: 'users',
      entityId: id,
      changes: { is_active: false },
    });
    return result;
  }
}
