import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AppointmentType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { WorkOrdersService } from '../work-orders/work-orders.service';

/** 预约类型 → 工单类型映射 */
const APPT_TO_WO: Record<string, string> = {
  standard: 'assessment',
  demo_day: 'assessment',
  same_day: 'assessment',
  install: 'install',
  repair: 'repair',
};

const NEXT_STEPS: Record<string, { en: string; zh: string }> = {
  standard: {
    en: 'We’ll review your request and confirm an on-site assessment within 1–2 weeks.',
    zh: '我们会审核你的请求，并在 1–2 周内确认上门评估时间。',
  },
  demo_day: {
    en: 'See you at our Burlington Demo Day this Saturday (10 AM–2 PM ET). A confirmation email is on its way.',
    zh: '本周六 Burlington 体验日见（上午 10:00–下午 2:00 东部时间）。确认邮件已发送。',
  },
  same_day: {
    en: 'We’ll confirm within 24 hours whether we can fit a same-day visit into this week’s route.',
    zh: '我们会在 24 小时内确认能否将你纳入本周的当日顺路评估。',
  },
};

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly workOrders: WorkOrdersService,
  ) {}

  /** 审批确认预约：找/建客户与地块 → 生成工单 → 发确认邮件。对应 M6「预约转工单」。 */
  async confirm(id: bigint) {
    const appt = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appt) throw new NotFoundException('Appointment not found');
    if (appt.status === 'confirmed') {
      throw new NotFoundException('Appointment already confirmed');
    }

    // 找/建客户
    let customerId = appt.customerId;
    if (!customerId && appt.contactEmail) {
      const existing = await this.prisma.customer.findUnique({ where: { email: appt.contactEmail } });
      const [firstName, ...rest] = (appt.contactName ?? '').split(' ');
      const customer =
        existing ??
        (await this.prisma.customer.create({
          data: {
            email: appt.contactEmail,
            firstName: firstName || null,
            lastName: rest.join(' ') || null,
            phone: appt.contactPhone,
            source: `appointment_${appt.type}`,
          },
        }));
      customerId = customer.id;
    }
    if (!customerId) throw new NotFoundException('Appointment has no contact to create a customer');

    // 建地块（若有地址）
    const addr = (appt.address ?? {}) as Record<string, unknown>;
    let propertyId: bigint | undefined;
    if (addr.street || addr.city) {
      const property = await this.prisma.property.create({
        data: {
          customerId,
          street: addr.street as string,
          city: addr.city as string,
          state: addr.state as string,
          zip: addr.zip as string,
          acres: addr.property_acres ? new Prisma.Decimal(addr.property_acres as number) : undefined,
          slope: addr.slope as string,
          wifiStatus: addr.wifi_status as string,
        },
      });
      propertyId = property.id;
    }

    const wo = await this.workOrders.create({
      type: APPT_TO_WO[appt.type] ?? 'assessment',
      customerId,
      propertyId,
      appointmentId: appt.id,
      scheduledAt: appt.preferredDate ?? undefined,
      notes: appt.notes ?? undefined,
    });

    await this.prisma.appointment.update({
      where: { id },
      data: { status: 'confirmed', confirmedAt: new Date(), customerId },
    });

    if (appt.contactEmail) {
      await this.mail.send({
        to: appt.contactEmail,
        subject: `DS SmartLawn · Appointment confirmed (${appt.number})`,
        text: `Your appointment ${appt.number} is confirmed. Work order ${wo.number} has been scheduled.`,
      });
    }
    return { appointment_number: appt.number, work_order_number: wo.number };
  }

  // ---------- 时段配置 ----------

  listTimeSlots(serviceType?: string) {
    return this.prisma.timeSlot.findMany({
      where: serviceType ? { serviceType } : {},
      orderBy: { startsAt: 'asc' },
    });
  }

  createTimeSlot(data: {
    serviceType: string;
    startsAt: Date;
    endsAt: Date;
    capacity?: number;
    region?: string;
  }) {
    return this.prisma.timeSlot.create({
      data: {
        serviceType: data.serviceType,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        capacity: data.capacity ?? 1,
        region: data.region,
      },
    });
  }

  async create(dto: CreateAppointmentDto) {
    const locale = dto.locale ?? 'en';
    const year = new Date().getFullYear();

    const appointment = await this.prisma.$transaction(async (tx) => {
      // 1) 创建线索（leads），来源记为预约类型
      await tx.lead.create({
        data: {
          email: dto.email,
          phone: dto.phone,
          firstName: dto.first_name,
          lastName: dto.last_name,
          source: `appointment_${dto.type}`,
          status: 'new',
        },
      });

      // 2) 创建预约（先占位 number，拿到 id 后回填正式编号）
      const created = await tx.appointment.create({
        data: {
          number: `tmp-${randomUUID()}`,
          type: dto.type as AppointmentType,
          status: 'requested',
          contactName: `${dto.first_name} ${dto.last_name}`,
          contactEmail: dto.email,
          contactPhone: dto.phone,
          address: {
            ...dto.address,
            property_acres: dto.property_acres,
            slope: dto.slope,
            wifi_status: dto.wifi_status,
          } as Prisma.InputJsonValue,
          preferredDate: dto.preferred_date ? new Date(dto.preferred_date) : null,
          preferredTown: dto.preferred_town,
          notes: dto.notes,
        },
      });

      const number = `APT-${year}-${String(created.id).padStart(5, '0')}`;
      return tx.appointment.update({ where: { id: created.id }, data: { number } });
    });

    // 3) 发确认邮件（客户）+ 通知（公司）
    const steps = NEXT_STEPS[dto.type][locale];
    await this.mail.send({
      to: dto.email,
      subject:
        locale === 'zh'
          ? `DS SmartLawn · 预约已收到（${appointment.number}）`
          : `DS SmartLawn · Appointment received (${appointment.number})`,
      text:
        locale === 'zh'
          ? `你好 ${dto.first_name}，\n\n我们已收到你的${this.typeLabel(dto.type, 'zh')}请求。\n确认号：${appointment.number}\n\n${steps}\n\n— DS SmartLawn Service`
          : `Hi ${dto.first_name},\n\nWe’ve received your ${this.typeLabel(dto.type, 'en')} request.\nConfirmation: ${appointment.number}\n\n${steps}\n\n— DS SmartLawn Service`,
    });

    const companyTo =
      this.config.get<string>('COMPANY_NOTIFY_EMAIL') ?? 'ops@dssmartlawn.com';
    await this.mail.send({
      to: companyTo,
      subject: `[New Lead] ${dto.type} · ${dto.first_name} ${dto.last_name} · ${dto.address.city}`,
      text: `New appointment ${appointment.number}\nType: ${dto.type}\nName: ${dto.first_name} ${dto.last_name}\nEmail: ${dto.email}\nPhone: ${dto.phone}\nAddress: ${dto.address.street}, ${dto.address.city}, ${dto.address.state} ${dto.address.zip}\nAcres: ${dto.property_acres ?? '-'} | Slope: ${dto.slope ?? '-'} | WiFi: ${dto.wifi_status ?? '-'}\nNotes: ${dto.notes ?? '-'}`,
    });

    return {
      appointment_id: appointment.uuid,
      confirmation_number: appointment.number,
      next_steps: steps,
    };
  }

  /** 后台：预约列表（分页 + 可按状态/类型筛选） */
  async list(page = 1, pageSize = 20, status?: string, type?: string) {
    const take = Math.min(pageSize, 100);
    const skip = (Math.max(page, 1) - 1) * take;
    const where = {
      ...(status ? { status } : {}),
      ...(type ? { type: type as AppointmentType } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.appointment.findMany({ where, orderBy: { createdAt: 'desc' }, take, skip }),
      this.prisma.appointment.count({ where }),
    ]);
    return {
      data: rows,
      meta: { total, current_page: page, page_size: take, total_pages: Math.ceil(total / take) },
    };
  }

  private typeLabel(type: string, locale: 'en' | 'zh'): string {
    const labels: Record<string, { en: string; zh: string }> = {
      standard: { en: 'free on-site assessment', zh: '免费上门评估' },
      demo_day: { en: 'Demo Day reservation', zh: '体验日登记' },
      same_day: { en: 'same-day visit', zh: '当日顺路评估' },
    };
    return labels[type]?.[locale] ?? type;
  }
}
