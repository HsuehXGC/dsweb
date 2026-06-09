import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** 销售流水线阶段 —— 对应需求文档 M2 看板：线索→联系→评估→报价→签约→交付 */
export const DEAL_STAGES = ['lead', 'contacted', 'assessment', 'quote', 'signed', 'delivered'] as const;
export type DealStage = (typeof DEAL_STAGES)[number];

@Injectable()
export class DealsService {
  constructor(private readonly prisma: PrismaService) {}

  /** 看板视图：返回每个阶段及其卡片（可按 ownerId 过滤——Sales 只看自己） */
  async board(ownerId?: bigint) {
    const where: Prisma.DealWhereInput = ownerId ? { ownerId } : {};
    const deals = await this.prisma.deal.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: { customer: { select: { uuid: true, firstName: true, lastName: true, email: true } } },
    });
    return DEAL_STAGES.map((stage) => ({
      stage,
      deals: deals.filter((d) => d.stage === stage),
    }));
  }

  create(data: { customerId: bigint; title: string; amount?: number; ownerId?: bigint; stage?: string }) {
    return this.prisma.deal.create({
      data: {
        customerId: data.customerId,
        title: data.title,
        stage: data.stage ?? 'lead',
        amount: data.amount !== undefined ? new Prisma.Decimal(data.amount) : undefined,
        ownerId: data.ownerId,
      },
    });
  }

  async update(id: bigint, data: { stage?: string; amount?: number; title?: string; ownerId?: bigint }) {
    const deal = await this.prisma.deal.findUnique({ where: { id } });
    if (!deal) throw new NotFoundException('Deal not found');
    return this.prisma.deal.update({
      where: { id },
      data: {
        stage: data.stage,
        title: data.title,
        amount: data.amount !== undefined ? new Prisma.Decimal(data.amount) : undefined,
        ownerId: data.ownerId,
      },
    });
  }
}
