import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SubscriptionsService } from './subscriptions.service';
import {
  SubscriptionsAdminController,
  SubscriptionsCustomerController,
} from './subscriptions.controller';
import { CustomerJwtGuard } from '../customer-auth/customer-jwt.guard';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [JwtModule.register({}), OrdersModule],
  controllers: [SubscriptionsCustomerController, SubscriptionsAdminController],
  providers: [SubscriptionsService, CustomerJwtGuard],
})
export class SubscriptionsModule {}
