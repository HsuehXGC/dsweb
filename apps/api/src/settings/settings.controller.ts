import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsArray } from 'class-validator';
import { SettingsService } from './settings.service';
import { RequirePermissions } from '../rbac/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { Public } from '../auth/public.decorator';

class UpdateSettingsDto {
  @IsArray()
  settings!: Array<{ key: string; value: unknown }>;
}

@ApiTags('settings')
@ApiBearerAuth()
@Controller({ path: 'admin/settings', version: '1' })
export class SettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @RequirePermissions('settings.read')
  list() {
    return this.settings.getAdminSettings();
  }

  @Put()
  @RequirePermissions('settings.write')
  async update(@Body() dto: UpdateSettingsDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.settings.upsertMany(dto.settings);
    await this.audit.record({
      userId: user.id,
      action: 'update',
      entity: 'settings',
      changes: { keys: dto.settings.map((s) => s.key) }, // 不记录敏感值
    });
    return result;
  }
}

@ApiTags('settings-public')
@Controller({ path: 'public/settings', version: '1' })
export class SettingsPublicController {
  constructor(private readonly settings: SettingsService) {}

  @Public()
  @Get()
  getPublic() {
    return this.settings.getPublicSettings();
  }
}
