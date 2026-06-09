import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import {
  AppointmentsAdminController,
  AppointmentsPublicController,
} from './appointments.controller';
import { WorkOrdersModule } from '../work-orders/work-orders.module';

@Module({
  imports: [WorkOrdersModule],
  controllers: [AppointmentsPublicController, AppointmentsAdminController],
  providers: [AppointmentsService],
})
export class AppointmentsModule {}
