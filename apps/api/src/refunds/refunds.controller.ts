import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentService } from '../payment/payment.service';
import { RequirePermissions } from '../rbac/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';

class RefundDto {
  @IsNumber() amount!: number;
  @IsOptional() @IsString() reason?: string;
}

@ApiTags('refunds')
@ApiBearerAuth()
@Controller({ path: 'admin', version: '1' })
export class RefundsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payment: PaymentService,
    private readonly audit: AuditService,
  ) {}

  @Get('refunds')
  @RequirePermissions('refunds.create')
  list(@Query('status') status?: string) {
    return this.prisma.refund.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
      include: { payment: { select: { orderId: true, gatewayTxnId: true } } },
    });
  }

  /** 财务审批并执行退款：调网关 → 记 refunds → 订单转 refunded。 */
  @Post('payments/:paymentId/refund')
  @RequirePermissions('refunds.approve')
  async refund(
    @Param('paymentId') paymentId: string,
    @Body() dto: RefundDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.payment.refundPayment(BigInt(paymentId), dto.amount, user.id);
    const payment = await this.prisma.payment.findUnique({ where: { id: BigInt(paymentId) } });
    if (result.success && payment?.orderId) {
      await this.prisma.order.update({
        where: { id: payment.orderId },
        data: { status: 'refunded', paymentStatus: 'refunded' },
      });
    }
    await this.audit.record({
      userId: user.id,
      action: 'refund',
      entity: 'payments',
      entityId: paymentId,
      changes: { amount: dto.amount, reason: dto.reason, success: result.success },
    });
    return result;
  }
}
