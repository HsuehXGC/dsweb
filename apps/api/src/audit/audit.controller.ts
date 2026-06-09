import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { RequirePermissions } from '../rbac/permissions.decorator';

@ApiTags('audit')
@ApiBearerAuth()
@Controller({ path: 'admin/audit-logs', version: '1' })
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions('audit_logs.read')
  async list(
    @Query('page') page = '1',
    @Query('page_size') pageSize = '20',
    @Query('entity') entity?: string,
    @Query('user_id') userId?: string,
    @Query('action') action?: string,
  ) {
    const take = Math.min(Number(pageSize) || 20, 100);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;
    const where = {
      ...(entity ? { entity } : {}),
      ...(action ? { action } : {}),
      ...(userId ? { userId: BigInt(userId) } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, take, skip }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: rows,
      meta: {
        total,
        current_page: Number(page) || 1,
        page_size: take,
        total_pages: Math.ceil(total / take),
      },
    };
  }
}
