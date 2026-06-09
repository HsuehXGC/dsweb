import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProductType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- 公开 ----------

  listPublic() {
    return this.prisma.product.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { id: 'asc' },
      include: { skus: true },
    });
  }

  async getPublicBySlug(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: { slug, isActive: true, deletedAt: null },
      include: { skus: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  // ---------- 后台 ----------

  list(params: { q?: string; type?: string }) {
    return this.prisma.product.findMany({
      where: {
        deletedAt: null,
        ...(params.type ? { type: params.type as ProductType } : {}),
        ...(params.q ? { name: { contains: params.q, mode: 'insensitive' } } : {}),
      },
      orderBy: { id: 'asc' },
      include: { skus: { include: { inventory: true } } },
    });
  }

  async get(id: bigint) {
    const p = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: { skus: { include: { inventory: { include: { warehouse: true } } } } },
    });
    if (!p) throw new NotFoundException('Product not found');
    return p;
  }

  async create(data: {
    slug: string;
    name: string;
    type?: string;
    basePrice: number;
    description?: Record<string, unknown>;
    specs?: Record<string, unknown>;
  }) {
    const exists = await this.prisma.product.findUnique({ where: { slug: data.slug } });
    if (exists) throw new BadRequestException('Slug already exists');
    return this.prisma.product.create({
      data: {
        slug: data.slug,
        name: data.name,
        type: (data.type as ProductType) ?? ProductType.one_time,
        basePrice: new Prisma.Decimal(data.basePrice),
        description: (data.description ?? {}) as Prisma.InputJsonValue,
        specs: (data.specs ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async update(
    id: bigint,
    data: { name?: string; basePrice?: number; isActive?: boolean; description?: Record<string, unknown> },
  ) {
    await this.ensure(id);
    return this.prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        isActive: data.isActive,
        basePrice: data.basePrice !== undefined ? new Prisma.Decimal(data.basePrice) : undefined,
        description: data.description as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async createSku(productId: bigint, data: { code: string; price?: number; variant?: Record<string, unknown> }) {
    await this.ensure(productId);
    const exists = await this.prisma.sku.findUnique({ where: { code: data.code } });
    if (exists) throw new BadRequestException('SKU code already exists');
    return this.prisma.sku.create({
      data: {
        productId,
        code: data.code,
        price: data.price !== undefined ? new Prisma.Decimal(data.price) : undefined,
        variant: (data.variant ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  private async ensure(id: bigint) {
    const p = await this.prisma.product.findFirst({ where: { id, deletedAt: null } });
    if (!p) throw new NotFoundException('Product not found');
  }
}
