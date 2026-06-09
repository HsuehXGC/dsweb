import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AppointmentType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

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
  ) {}

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
