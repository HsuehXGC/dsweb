import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * 邮件服务 —— 对应需求文档 M9 邮件配置 / C2 确认邮件。
 * V1 默认 console provider（开发期打日志）；生产切 SendGrid/Postmark/SES。
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  async send(msg: MailMessage): Promise<void> {
    const provider = this.config.get<string>('MAIL_PROVIDER') ?? 'console';
    const from = this.config.get<string>('MAIL_FROM') ?? 'no-reply@dssmartlawn.com';

    if (provider === 'console') {
      this.logger.log(
        `\n──── EMAIL (console) ────\nFrom: ${from}\nTo: ${msg.to}\nSubject: ${msg.subject}\n\n${msg.text}\n─────────────────────────`,
      );
      return;
    }

    // TODO(Phase 2/4): 接入 SendGrid / Postmark / SES
    this.logger.warn(`Mail provider "${provider}" 尚未实现，回退到 console`);
    this.logger.log(`To: ${msg.to} | Subject: ${msg.subject}`);
  }
}
