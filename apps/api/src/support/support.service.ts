import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma, PublishStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  // ---------- 公开：提交咨询 ----------

  async createTicket(data: {
    subject: string;
    body: string;
    email: string;
    name?: string;
    channel?: string;
  }) {
    const customer = await this.prisma.customer.findUnique({ where: { email: data.email } });
    const year = new Date().getFullYear();
    const ticket = await this.prisma.supportTicket.create({
      data: {
        number: `tmp-${randomUUID()}`,
        subject: data.subject,
        channel: data.channel ?? 'web_form',
        status: 'open',
        priority: 'normal',
        customerId: customer?.id,
        slaDueAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h SLA
        messages: {
          create: { direction: 'inbound', channel: data.channel ?? 'web_form', body: data.body },
        },
      },
    });
    const updated = await this.prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { number: `TKT-${year}-${String(ticket.id).padStart(5, '0')}` },
    });
    return { ticket_number: updated.number };
  }

  // ---------- 后台：收件箱 ----------

  listTickets(params: { status?: string; assignedToId?: string }) {
    return this.prisma.supportTicket.findMany({
      where: {
        ...(params.status ? { status: params.status } : {}),
        ...(params.assignedToId ? { assignedToId: BigInt(params.assignedToId) } : {}),
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: { customer: { select: { email: true, firstName: true, lastName: true } } },
    });
  }

  /** 工单详情 + 对话 + 一屏客户视图（订单/设备/工单） */
  async getTicket(id: bigint) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        customer: {
          include: {
            orders: { orderBy: { placedAt: 'desc' }, take: 5, select: { number: true, status: true, total: true } },
            devices: { select: { model: true, serialNumber: true } },
            workOrders: { orderBy: { createdAt: 'desc' }, take: 5, select: { number: true, type: true, status: true } },
          },
        },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async reply(id: bigint, body: string, authorId: bigint, internal: boolean) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id }, include: { customer: true } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    const message = await this.prisma.message.create({
      data: {
        ticketId: id,
        direction: internal ? 'internal_note' : 'outbound',
        body,
        authorId,
      },
    });
    if (!internal) {
      await this.prisma.supportTicket.update({ where: { id }, data: { status: 'pending' } });
      if (ticket.customer?.email) {
        await this.mail.send({
          to: ticket.customer.email,
          subject: `Re: ${ticket.subject} (${ticket.number})`,
          text: body,
        });
      }
    }
    return message;
  }

  update(id: bigint, data: { status?: string; priority?: string; assignedToId?: string | null }) {
    return this.prisma.supportTicket.update({
      where: { id },
      data: {
        status: data.status,
        priority: data.priority,
        assignedToId:
          data.assignedToId === undefined ? undefined : data.assignedToId === null ? null : BigInt(data.assignedToId),
      },
    });
  }

  // ---------- 知识库 ----------

  listPublicKb(category?: string) {
    return this.prisma.kbArticle.findMany({
      where: { isPublic: true, status: PublishStatus.published, deletedAt: null, ...(category ? { category } : {}) },
      orderBy: { sort: 'asc' },
    });
  }

  listKb() {
    return this.prisma.kbArticle.findMany({ where: { deletedAt: null }, orderBy: { id: 'asc' } });
  }

  createKb(data: { category?: string; isPublic?: boolean; question: Record<string, unknown>; answer: Record<string, unknown> }) {
    return this.prisma.kbArticle.create({
      data: {
        category: data.category,
        isPublic: data.isPublic ?? true,
        status: PublishStatus.published,
        question: data.question as Prisma.InputJsonValue,
        answer: data.answer as Prisma.InputJsonValue,
      },
    });
  }
}
