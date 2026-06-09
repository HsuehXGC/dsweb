import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword } from '../common/password.util';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(page = 1, pageSize = 20) {
    const take = Math.min(pageSize, 100);
    const skip = (Math.max(page, 1) - 1) * take;
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { deletedAt: null },
        orderBy: { id: 'asc' },
        take,
        skip,
        include: { role: true },
      }),
      this.prisma.user.count({ where: { deletedAt: null } }),
    ]);
    return {
      data: rows.map((u) => this.serialize(u)),
      meta: {
        total,
        current_page: page,
        page_size: take,
        total_pages: Math.ceil(total / take),
      },
    };
  }

  async create(dto: CreateUserDto) {
    const role = await this.prisma.role.findUnique({ where: { code: dto.role_code } });
    if (!role) {
      throw new BadRequestException(`Unknown role: ${dto.role_code}`);
    }
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) {
      throw new BadRequestException('Email already in use');
    }
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: await hashPassword(dto.password),
        firstName: dto.first_name,
        lastName: dto.last_name,
        phone: dto.phone,
        roleId: role.id,
      },
      include: { role: true },
    });
    return this.serialize(user);
  }

  async update(id: bigint, dto: UpdateUserDto) {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    let roleId = user.roleId;
    if (dto.role_code) {
      const role = await this.prisma.role.findUnique({ where: { code: dto.role_code } });
      if (!role) {
        throw new BadRequestException(`Unknown role: ${dto.role_code}`);
      }
      roleId = role.id;
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        firstName: dto.first_name ?? user.firstName,
        lastName: dto.last_name ?? user.lastName,
        phone: dto.phone ?? user.phone,
        isActive: dto.is_active ?? user.isActive,
        roleId,
      },
      include: { role: true },
    });
    return this.serialize(updated);
  }

  async deactivate(id: bigint) {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.prisma.user.update({ where: { id }, data: { isActive: false } });
    // 同时撤销其全部会话（强制下线）
    await this.prisma.session.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  private serialize(u: {
    uuid: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    isActive: boolean;
    lastLoginAt: Date | null;
    role: { code: string; name: string };
  }) {
    return {
      uuid: u.uuid,
      email: u.email,
      first_name: u.firstName,
      last_name: u.lastName,
      phone: u.phone,
      is_active: u.isActive,
      last_login_at: u.lastLoginAt,
      role: u.role.code,
      role_name: u.role.name,
    };
  }
}
