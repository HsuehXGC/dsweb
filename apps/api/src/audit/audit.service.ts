import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface AuditEntry {
  userId?: bigint;
  action: string; // create / update / delete / approve ...
  entity: string; // 表名
  entityId?: string;
  changes?: unknown; // before/after diff
  ip?: string;
  userAgent?: string;
}

/**
 * 审计日志服务 —— 对应需求文档 4.3 / 3.3。
 * 所有 write 操作应调用 record() 记录操作人、对象与变更。
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        changes: entry.changes === undefined ? undefined : (entry.changes as object),
        ip: entry.ip,
        userAgent: entry.userAgent,
      },
    });
  }
}
