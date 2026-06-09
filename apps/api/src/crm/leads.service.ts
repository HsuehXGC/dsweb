import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: {
    page?: number;
    pageSize?: number;
    status?: string;
    source?: string;
    q?: string;
    assignedToId?: string;
  }) {
    const take = Math.min(params.pageSize ?? 20, 100);
    const skip = (Math.max(params.page ?? 1, 1) - 1) * take;
    const where: Prisma.LeadWhereInput = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.source ? { source: params.source } : {}),
      ...(params.assignedToId ? { assignedToId: BigInt(params.assignedToId) } : {}),
      ...(params.q
        ? {
            OR: [
              { email: { contains: params.q, mode: 'insensitive' } },
              { firstName: { contains: params.q, mode: 'insensitive' } },
              { lastName: { contains: params.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.lead.findMany({ where, orderBy: { createdAt: 'desc' }, take, skip }),
      this.prisma.lead.count({ where }),
    ]);
    return {
      data: rows,
      meta: {
        total,
        current_page: params.page ?? 1,
        page_size: take,
        total_pages: Math.ceil(total / take),
      },
    };
  }

  async get(id: bigint) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: { convertedCustomer: { select: { uuid: true, email: true } } },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async update(
    id: bigint,
    data: { status?: string; assignedToId?: string | null; score?: number; lostReason?: string },
  ) {
    await this.ensure(id);
    return this.prisma.lead.update({
      where: { id },
      data: {
        status: data.status,
        assignedToId:
          data.assignedToId === undefined
            ? undefined
            : data.assignedToId === null
              ? null
              : BigInt(data.assignedToId),
        score: data.score,
        lostReason: data.lostReason,
      },
    });
  }

  /** 转客户：用线索信息创建 customer，回填 lead.convertedCustomerId 并置状态 converted */
  async convert(id: bigint) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');
    if (lead.convertedCustomerId) {
      throw new BadRequestException('Lead already converted');
    }
    const existing = await this.prisma.customer.findUnique({ where: { email: lead.email } });

    const customer =
      existing ??
      (await this.prisma.customer.create({
        data: {
          email: lead.email,
          phone: lead.phone,
          firstName: lead.firstName,
          lastName: lead.lastName,
          source: lead.source ?? 'lead',
        },
      }));

    await this.prisma.lead.update({
      where: { id },
      data: { status: 'converted', convertedCustomerId: customer.id },
    });
    return { customer_uuid: customer.uuid, customer_id: customer.id };
  }

  private async ensure(id: bigint) {
    const exists = await this.prisma.lead.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Lead not found');
  }
}
