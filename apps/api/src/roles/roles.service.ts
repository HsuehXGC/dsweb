import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async listRoles() {
    const roles = await this.prisma.role.findMany({
      orderBy: { id: 'asc' },
      include: { permissions: { include: { permission: true } } },
    });
    return roles.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      is_system: r.isSystem,
      permissions: r.permissions.map((rp) => rp.permission.code),
    }));
  }

  listPermissions() {
    return this.prisma.permission.findMany({ orderBy: [{ resource: 'asc' }, { action: 'asc' }] });
  }

  /** 设置某角色的权限点集合（覆盖式） */
  async setRolePermissions(roleId: bigint, permissionCodes: string[]) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    const permissions = await this.prisma.permission.findMany({
      where: { code: { in: permissionCodes } },
      select: { id: true },
    });

    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId } }),
      this.prisma.rolePermission.createMany({
        data: permissions.map((p) => ({ roleId, permissionId: p.id })),
      }),
    ]);
    return this.listRoles().then((roles) => roles.find((r) => r.id === roleId));
  }
}
