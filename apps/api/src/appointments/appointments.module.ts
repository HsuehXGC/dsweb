import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import {
  AppointmentsAdminController,
  AppointmentsPublicController,
} from './appointments.controller';

@Module({
  controllers: [AppointmentsPublicController, AppointmentsAdminController],
  providers: [AppointmentsService],
})
export class AppointmentsModule {}
