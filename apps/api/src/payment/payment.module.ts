import { Global, Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { MockPaymentProvider } from './mock.provider';
import { ProChargeProvider } from './procharge.provider';

@Global()
@Module({
  providers: [PaymentService, MockPaymentProvider, ProChargeProvider],
  exports: [PaymentService],
})
export class PaymentModule {}
