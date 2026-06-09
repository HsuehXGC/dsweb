import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MarketingService } from './marketing.service';
import { MarketingController, ReferralCustomerController } from './marketing.controller';
import { CustomerJwtGuard } from '../customer-auth/customer-jwt.guard';

@Module({
  imports: [JwtModule.register({})],
  controllers: [MarketingController, ReferralCustomerController],
  providers: [MarketingService, CustomerJwtGuard],
})
export class MarketingModule {}
