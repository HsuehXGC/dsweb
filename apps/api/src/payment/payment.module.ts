import { Global, Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { MockPaymentProvider } from './mock.provider';

@Global()
@Module({
  providers: [PaymentService, MockPaymentProvider],
  exports: [PaymentService],
})
export class PaymentModule {}
