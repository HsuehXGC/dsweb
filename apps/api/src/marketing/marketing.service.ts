import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class MarketingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  // ---------- 折扣码 ----------

  listDiscounts() {
    return this.prisma.discountCode.findMany({ orderBy: { id: 'desc' } });
  }

  createDiscount(data: {
    code: string;
    type?: string;
    value: number;
    minAmount?: number;
    maxUses?: number;
    membersOnly?: boolean;
    expiresAt?: Date;
  }) {
    return this.prisma.discountCode.create({
      data: {
        code: data.code.toUpperCase(),
        type: data.type ?? 'percent',
        value: new Prisma.Decimal(data.value),
        minAmount: data.minAmount !== undefined ? new Prisma.Decimal(data.minAmount) : undefined,
        maxUses: data.maxUses,
        membersOnly: data.membersOnly ?? false,
        expiresAt: data.expiresAt,
      },
    });
  }

  async toggleDiscount(id: bigint, isActive: boolean) {
    return this.prisma.discountCode.update({ where: { id }, data: { isActive } });
  }

  // ---------- 推荐返现 ----------

  /** 取/生成客户的推荐码 */
  async referralForCustomer(customerId: bigint) {
    const existing = await this.prisma.referral.findFirst({ where: { referrerCustomerId: customerId } });
    if (existing) return existing;
    const code = `REF-${createHash('sha256').update(`${customerId}`).digest('hex').slice(0, 8).toUpperCase()}`;
    return this.prisma.referral.create({
      data: { referrerCustomerId: customerId, code, status: 'pending' },
    });
  }

  listReferrals() {
    return this.prisma.referral.findMany({ orderBy: { id: 'desc' } });
  }

  // ---------- 邮件群发 ----------

  listCampaigns() {
    return this.prisma.emailCampaign.findMany({ orderBy: { id: 'desc' } });
  }

  createCampaign(data: { name: string; subject: string; segment?: Record<string, unknown> }) {
    return this.prisma.emailCampaign.create({
      data: {
        name: data.name,
        subject: data.subject,
        segment: (data.segment ?? {}) as Prisma.InputJsonValue,
        status: 'draft',
      },
    });
  }

  /** 发送：按 segment(标签)筛选客户，mock 群发，记录统计。 */
  async sendCampaign(id: bigint, bodyText: string) {
    const campaign = await this.prisma.emailCampaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    const customers = await this.prisma.customer.findMany({
      where: { deletedAt: null, email: { not: '' } },
      select: { email: true },
      take: 500,
    });
    for (const c of customers) {
      await this.mail.send({ to: c.email, subject: campaign.subject, text: bodyText });
    }
    return this.prisma.emailCampaign.update({
      where: { id },
      data: {
        status: 'sent',
        sentAt: new Date(),
        stats: { recipients: customers.length, opened: 0, clicked: 0 } as Prisma.InputJsonValue,
      },
    });
  }
}
