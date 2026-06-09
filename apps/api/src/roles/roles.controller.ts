import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';
import { RolesService } from './roles.service';
import { RequirePermissions } from '../rbac/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';

class SetPermissionsDto {
  @IsArray()
  @IsString({ each: true })
  permissions!: string[];
}

@ApiTags('roles')
@ApiBearerAuth()
@Controller({ path: 'admin', version: '1' })
export class RolesController {
  constructor(
    private readonly roles: RolesService,
    private readonly audit: AuditService,
  ) {}

  @Get('roles')
  @RequirePermissions('roles.read')
  listRoles() {
    return this.roles.listRoles();
  }

  @Get('permissions')
  @RequirePermissions('roles.read')
  listPermissions() {
    return this.roles.listPermissions();
  }

  @Put('roles/:id/permissions')
  @RequirePermissions('roles.write')
  async setPermissions(
    @Param('id') id: string,
    @Body() dto: SetPermissionsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.roles.setRolePermissions(BigInt(id), dto.permissions);
    await this.audit.record({
      userId: user.id,
      action: 'update',
      entity: 'roles',
      entityId: id,
      changes: { permissions: dto.permissions },
    });
    return result;
  }
}
